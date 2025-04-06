import csv
import io
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import openpyxl
import xlwt
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from .models import Notification
from django.contrib.auth.models import User


def generate_pdf_report(data):
    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="report.pdf"'

    p = canvas.Canvas(response)
    p.drawString(100, 800, "Grant Allocation Report")

    y_position = 780
    for item in data:
        p.drawString(100, y_position, f"Organization: {item.organization}, Amount: {item.amount}")
        y_position -= 20

    p.showPage()
    p.save()
    return response

def generate_excel_report(data):
    response = HttpResponse(content_type="application/ms-excel")
    response["Content-Disposition"] = 'attachment; filename="report.xls"'

    wb = xlwt.Workbook(encoding="utf-8")
    ws = wb.add_sheet("Report")

    columns = ["Organization", "Amount", "Date"]
    for col_num, column_title in enumerate(columns):
        ws.write(0, col_num, column_title)

    for row_num, obj in enumerate(data, start=1):
        ws.write(row_num, 0, str(obj.organization))
        ws.write(row_num, 1, str(obj.amount))
        ws.write(row_num, 2, str(obj.allocation_date))

    wb.save(response)
    return response

def generate_csv_report(data):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="report.csv"'

    writer = csv.writer(response)
    writer.writerow(["Organization", "Amount", "Date"])

    for obj in data:
        writer.writerow([obj.organization, obj.amount, obj.allocation_date])

    return response

def notify_user(user, message, type="Info", link=None):
    Notification.objects.create(
        user=user,
        message=message,
        type=type,
        status='Unread',
        target_audience='user',
        link=link
    )

def notify_admins(message, type="Info", link=None):
    Notification.objects.create(
        user=None,
        message=message,
        type=type,
        status='Unread',
        target_audience='admin',
        link=link
    )