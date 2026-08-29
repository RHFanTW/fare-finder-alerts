import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
ROUTE_LABELS = {"TPE-TYO": "台北 -> 東京", "TPE-SEL": "台北 -> 首爾"}
NOTIFY_FLOOR_HOURS = int(os.environ.get("NOTIFY_FLOOR_HOURS", "24"))
REALERT_PCT = Decimal(os.environ.get("REALERT_PCT", "20"))
REALERT_ABS_TWD = Decimal(os.environ.get("REALERT_ABS_TWD", "2000"))

secrets = boto3.client("secretsmanager")
history = boto3.resource("dynamodb").Table("notification_history")


def now_utc():
    return datetime.now(timezone.utc)


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fmt_twd(value):
    return f"NT${int(value):,}"


def route_label(route):
    return ROUTE_LABELS.get(route, route.replace("-", " -> "))


def booking_url(message):
    cheapest = message["cheapest"]
    origin, destination = message["route"].split("-")
    depart = (cheapest.get("depart_date") or "")[:10].replace("-", "")
    ret = (cheapest.get("return_date") or "")[:10].replace("-", "")
    ddmm = depart[6:8] + depart[4:6] if len(depart) == 8 else ""
    rdmm = ret[6:8] + ret[4:6] if len(ret) == 8 else ""
    path = f"{origin}{ddmm}{destination}{rdmm}"
    url = f"https://www.aviasales.com/search/{path}"
    marker = message.get("marker")
    return url + ("?" + urllib.parse.urlencode({"marker": marker}) if marker else "")


def subject(message):
    price = fmt_twd(message["cheapest"]["price"])
    return f"{route_label(message['route'])} 降價通知！{price} 已達標"


def render_text(message):
    cheapest = message["cheapest"]
    target = fmt_twd(message["target_price"])
    lines = [
        f"{route_label(message['route'])} 已達到你的目標價。",
        f"目前最低票價：{fmt_twd(cheapest['price'])}",
        f"你的目標價：{target}",
    ]
    if message.get("cheapest_usd"):
        lines.append(f"約 US${int(message['cheapest_usd']['price']):,}")
    if cheapest.get("airline"):
        lines.append(f"航空公司：{cheapest['airline']}")
    if cheapest.get("depart_date"):
        lines.append(f"出發：{cheapest['depart_date']}")
    if cheapest.get("return_date"):
        lines.append(f"回程：{cheapest['return_date']}")
    lines.append(f"立即訂購：{booking_url(message)}")
    return "\n".join(lines)


def render_html(message):
    cheapest = message["cheapest"]
    usd = ""
    if message.get("cheapest_usd"):
        usd = f"<p style='margin:4px 0 0;color:#64748b'>約 US${int(message['cheapest_usd']['price']):,}</p>"
    airline = f"<p style='margin:12px 0 0;color:#334155'>航空公司：{cheapest['airline']}</p>" if cheapest.get("airline") else ""
    dates = ""
    if cheapest.get("depart_date") or cheapest.get("return_date"):
        dates = f"<p style='margin:8px 0 0;color:#334155'>出發：{cheapest.get('depart_date') or '-'}<br/>回程：{cheapest.get('return_date') or '-'}</p>"
    return f"""<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<h1 style="margin:0 0 12px;font-size:24px">{route_label(message['route'])} 已達標</h1>
<p style="margin:0;color:#475569">你的目標價是 {fmt_twd(message['target_price'])}</p>
<div style="margin:24px 0;padding:24px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff">
<p style="margin:0;color:#64748b">目前最低票價</p>
<p style="margin:6px 0 0;font-size:34px;font-weight:700;color:#0f766e">{fmt_twd(cheapest['price'])}</p>
{usd}{airline}{dates}
<a href="{booking_url(message)}" style="display:inline-block;margin-top:22px;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px">立即訂購</a>
</div>
<p style="font-size:12px;color:#64748b">Flight Price Notifier</p>
</div></body></html>"""


def get_resend_secret():
    raw = secrets.get_secret_value(SecretId="flight/resend")["SecretString"]
    return json.loads(raw)


def should_send(pk, price):
    result = history.query(
        KeyConditionExpression=Key("pk").eq(pk),
        ScanIndexForward=False,
        Limit=1,
    )
    items = result.get("Items", [])
    if not items:
        return True
    last = items[0]
    last_time = parse_time(last["sent_at"])
    age_hours = (now_utc() - last_time).total_seconds() / 3600
    if age_hours >= NOTIFY_FLOOR_HOURS:
        return True
    last_price = Decimal(str(last["price"]))
    new_price = Decimal(str(price))
    return new_price <= last_price * (Decimal("1") - REALERT_PCT / Decimal("100")) or (
        last_price - new_price
    ) >= REALERT_ABS_TWD


def send_email(secret, message):
    body = {
        "from": secret["from"],
        "to": message["email"],
        "subject": subject(message),
        "html": render_html(message),
        "text": render_text(message),
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + secret["api_key"],
            "Content-Type": "application/json",
            "User-Agent": UA,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            print("RESEND_OK", res.status, res.read().decode())
            return True
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        print("RESEND_ERR", exc.code, body)
        if exc.code in (403, 422):
            return False
        raise


def handle_message(message):
    pk = f"{message['email']}#{message['route']}"
    price = int(message["cheapest"]["price"])
    if not should_send(pk, price):
        print("skipped (deduped)", pk, price)
        return

    secret = get_resend_secret()
    sent = send_email(secret, message)
    if sent:
        sent_at = now_utc().isoformat().replace("+00:00", "Z")
        history.put_item(
            Item={
                "pk": pk,
                "sent_at": sent_at,
                "email": message["email"],
                "route": message["route"],
                "price": Decimal(str(price)),
                "currency": "TWD",
            }
        )


def handler(event, context):
    for record in event.get("Records", []):
        handle_message(json.loads(record["body"]))
    return {"ok": True, "records": len(event.get("Records", []))}
