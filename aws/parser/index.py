import json
import os
import time
import urllib.parse
import urllib.request
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr


UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
secrets = boto3.client("secretsmanager")
sqs = boto3.client("sqs")
ddb = boto3.resource("dynamodb")
subscriptions = ddb.Table("subscriptions")


def next_month():
    now = time.gmtime()
    year = now.tm_year + (1 if now.tm_mon == 12 else 0)
    month = 1 if now.tm_mon == 12 else now.tm_mon + 1
    return f"{year:04d}-{month:02d}"


def get_token():
    raw = secrets.get_secret_value(SecretId="flight/travelpayouts")["SecretString"]
    return json.loads(raw)["token"]


def fetch_cheapest(origin, destination, month, token, currency):
    query = urllib.parse.urlencode(
        {
            "origin": origin,
            "destination": destination,
            "depart_date": month,
            "currency": currency,
            "token": token,
        }
    )
    req = urllib.request.Request(
        f"https://api.travelpayouts.com/v1/prices/cheap?{query}",
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        body = json.loads(res.read())

    if not body.get("success") or not body.get("data"):
        return None
    offers = body["data"].get(destination, {})
    if not offers:
        return None

    best = min(offers.values(), key=lambda offer: Decimal(str(offer["price"])))
    return {
        "price": int(best["price"]),
        "currency": currency.upper(),
        "airline": best.get("airline"),
        "depart_date": best.get("departure_at"),
        "return_date": best.get("return_at"),
    }


def handler(event, context):
    origin = event["origin"]
    destination = event["destination"]
    route = event.get("route") or f"{origin}-{destination}"
    plan_name = event.get("plan") or event.get("plan_name")
    month = event.get("depart_date") or next_month()
    token = get_token()

    try:
        cheapest_twd = fetch_cheapest(origin, destination, month, token, "twd")
    except Exception as exc:
        print("TWD fetch failed", route, type(exc).__name__, str(exc))
        return {"ok": False, "route": route, "matched": 0}

    if not cheapest_twd:
        print("no TWD fare for", route, month, "- skipping")
        return {"ok": True, "route": route, "matched": 0}

    try:
        cheapest_usd = fetch_cheapest(origin, destination, month, token, "usd")
    except Exception as exc:
        print("USD fetch failed", route, type(exc).__name__, str(exc))
        cheapest_usd = None

    queue_url = sqs.get_queue_url(QueueName="flight-fare-queue")["QueueUrl"]
    price = Decimal(str(cheapest_twd["price"]))
    matched = 0
    result = subscriptions.scan(FilterExpression=Attr("route").eq(route))

    for item in result.get("Items", []):
        target = Decimal(str(item["target_price"]))
        if target < price:
            continue
        message = {
            "email": item["email"],
            "route": route,
            "plan_name": item.get("plan_name") or plan_name,
            "target_price": int(target),
            "cheapest": cheapest_twd,
        }
        if cheapest_usd:
            message["cheapest_usd"] = cheapest_usd
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message, ensure_ascii=False))
        matched += 1

    print(route, month, cheapest_twd["price"], "TWD", "matched", matched)
    return {"ok": True, "route": route, "matched": matched, "cheapest": cheapest_twd}
