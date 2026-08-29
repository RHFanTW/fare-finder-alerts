import json
import time
from decimal import Decimal, InvalidOperation

import boto3


PLANS = {
    "tokyo": {"origin": "TPE", "destination": "TYO", "label": "台北 -> 東京"},
    "seoul": {"origin": "TPE", "destination": "SEL", "label": "台北 -> 首爾"},
}

table = boto3.resource("dynamodb").Table("subscriptions")


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST,OPTIONS",
            "access-control-allow-headers": "content-type",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return response(204, {})

    try:
        body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64

            body = base64.b64decode(body).decode("utf-8")
        data = json.loads(body)
    except Exception:
        return response(400, {"error": "Invalid JSON body"})

    email = str(data.get("email") or "").strip().lower()
    plan_name = str(data.get("plan_name") or "").strip().lower()
    target_raw = data.get("target_price")

    if not email or "@" not in email:
        return response(400, {"error": "Valid email is required"})
    if plan_name not in PLANS:
        return response(400, {"error": "Unknown plan"})

    try:
        target_price = Decimal(str(target_raw))
    except (InvalidOperation, TypeError):
        return response(400, {"error": "Target price must be a number"})

    if target_price <= 0:
        return response(400, {"error": "Target price must be positive"})

    plan = PLANS[plan_name]
    route = f"{plan['origin']}-{plan['destination']}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    item = {
        "email": email,
        "route": route,
        "plan_name": plan_name,
        "origin": plan["origin"],
        "destination": plan["destination"],
        "target_price": target_price,
        "currency": "TWD",
        "created_at": now,
        "updated_at": now,
    }

    table.put_item(Item=item)
    return response(
        200,
        {
            "ok": True,
            "subscription": {
                **{k: v for k, v in item.items() if k != "target_price"},
                "target_price": int(target_price),
            },
        },
    )
