import json
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


table = boto3.resource("dynamodb").Table("subscriptions")


def encode(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Cannot JSON encode {type(value).__name__}")


def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,OPTIONS",
            "access-control-allow-headers": "content-type",
        },
        "body": json.dumps(body, ensure_ascii=False, default=encode),
    }


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return response(204, {})

    params = event.get("queryStringParameters") or {}
    email = str(params.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return response(400, {"error": "Valid email is required"})

    result = table.query(KeyConditionExpression=Key("email").eq(email))
    return response(200, {"subscriptions": result.get("Items", [])})
