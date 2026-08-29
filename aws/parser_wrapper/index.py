import json
import os

import boto3


s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")


def handler(event, context):
    bucket = os.environ["CONFIG_BUCKET"]
    raw = s3.get_object(Bucket=bucket, Key="flight-routes.json")["Body"].read()
    routes = json.loads(raw)
    invoked = 0
    for route in routes:
        payload = {
            "plan": route["plan"],
            "origin": route["origin"],
            "destination": route["destination"],
            "route": f"{route['origin']}-{route['destination']}",
        }
        lambda_client.invoke(
            FunctionName="flight-parser",
            InvocationType="Event",
            Payload=json.dumps(payload).encode("utf-8"),
        )
        invoked += 1
    print("invoked parser routes", invoked)
    return {"ok": True, "invoked": invoked}
