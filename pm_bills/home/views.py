from django.shortcuts import redirect, render,HttpResponse,get_object_or_404
from home.models import OrganizationDetails,Expense,Bill,GrantAllocation,ReportHistory,Notification
from django.contrib.auth import authenticate, login
from django.contrib.auth.views import LoginView
from django.contrib import messages
from django.http import JsonResponse,HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from django.db.models import Sum
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from .utils import generate_pdf_report, generate_excel_report, generate_csv_report
from .utils import notify_admins,notify_user
from .models import Expense, GrantAllocation, OrganizationDetails, Bill, ReportHistory,Notification
from django.db.models import Sum
from django.utils.dateformat import format as date_format 


# Create your views here.
def index(request):
    latest_bills = Bill.objects.select_related('organization').order_by('-submission_date')[:3]
    latest_grants = GrantAllocation.objects.select_related('organization').order_by('-allocation_date')[:3]
    latest_expenses = Expense.objects.select_related('organization').order_by('-date')[:3]

    return render(request, 'index.html', {
        'latest_bills': latest_bills,
        'latest_grants': latest_grants,
        'latest_expenses': latest_expenses,
    })

def example_view(request):
    user = request.user  # or fetch another valid user
    Notification.objects.create(
        user=user,
        message="Welcome to the system!",
        type="info"
    )
    return JsonResponse({"success": True})

def api_bills(request):
    bills = list(Bill.objects.values('bill_amount', 'submission_date', 'bill_description', 'status', 'organization__organization_name'))
    return JsonResponse(bills, safe=False)

def api_expenses(request):
    expenses = list(Expense.objects.values('amount', 'date', 'description', 'category', 'organization__organization_name'))
    return JsonResponse(expenses, safe=False)

def api_organization(request):
    org = OrganizationDetails.objects.first()
    if org:
        data = {
            'name': org.organization_name,
            'budget': float(org.budget),  # JSON can't serialize Decimal directly
            'address': org.address,
            'contact': org.contact,
            'email': org.email,
            'phone': org.phone
        }
        return JsonResponse(data)
    return JsonResponse({'error': 'Organization not found'}, status=404)
    
 # Temporarily disable CSRF for testing (not recommended for production)
@csrf_exempt  # Remove this in production, use proper CSRF handling instead
def login_view(request):
    if request.method == "GET":
        return render(request, 'login.html')

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            selected_role = data.get('role')  # 'admin' or 'user'

            user = authenticate(request, username=username, password=password)

            if user is not None:
                # Check role match
                is_admin = user.is_staff
                if (selected_role == 'admin' and is_admin) or (selected_role == 'user' and not is_admin):
                    login(request, user)
                    return JsonResponse({
                        "success": True,
                        "user": {
                            "username": user.username,
                            "role": selected_role
                        }
                    })
                else:
                    return JsonResponse({
                        "success": False,
                        "message": "Invalid username, password, or role"
                    })
            else:
                return JsonResponse({
                    "success": False,
                    "message": "Invalid username or password"
                })
        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": f"Error: {str(e)}"
            })

    return JsonResponse({
        "success": False,
        "message": "Invalid request method"
    }, status=405)

def user_dashboard(request):
    return render(request,'user-dashboard.html')


def user_dashboard_api(request):
    user = request.user
    organization = getattr(user, 'OrganizationDetails', None)  
    bills = Bill.objects.filter(user=user)
    expenses = Expense.objects.filter(user=user)

    # Sum user-specific expenses
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
    total_grants = 0

    # Sum organization-wide grants
    if organization:
        total_grants = GrantAllocation.objects.filter(organization=organization).aggregate(total=Sum('amount'))['total'] or 0

    # Available funds = grants for org - user's expenses
    available_funds = total_grants - total_expenses

    response_data = {
        'bills_count': bills.count(),
        'approved_bills': bills.filter(status='approved').count(),
        'pending_bills': bills.filter(status='pending').count(),
        'rejected_bills': bills.filter(status='rejected').count(),
        'total_expenses': total_expenses,
        'total_grants': total_grants,
        'available_funds': available_funds,
        'bills': list(bills.values('bill_description', 'bill_amount', 'status'))
    }

    return JsonResponse(response_data)


def admin_dashboard(request):
    return render(request,'admin-dashboard.html')


def bill_approval(request):
    if request.method == "POST":
        bill_id = request.POST.get("bill_id")
        action = request.POST.get("action")  # "approve" or "reject"

        # Get Bill instance
        bill = get_object_or_404(Bill, id=bill_id)

        # Update status based on action
        if action == "approve":
            bill.status = "approved"
            notif_type = "success"
            notif_msg = f"Your bill #{bill.id} has been approved!"
        elif action == "reject":
            bill.status = "rejected"
            notif_type = "warning"
            notif_msg = f"Your bill #{bill.id} has been rejected."
        else:
            return JsonResponse({"success": False, "message": "Invalid action."}, status=400)

        bill.save()

        # 🔔 Create notification
        Notification.objects.create(
            user=bill.user,
            message=notif_msg,
            type=notif_type,
            status='Unread'
        )

        return JsonResponse({"success": True, "message": f"Bill {action}d successfully!"})

    # If GET request, fetch all pending bills
    pending_bills = Bill.objects.filter(status="pending")
    return render(request, "bill-approval.html", {"pending_bills": pending_bills})

def bill_submission(request):
    organizations = OrganizationDetails.objects.all()  # Get all organizations

    if request.method == "POST":
        try:
            organization_id = request.POST.get("organization_id")  # Fix: Use ID instead of name
            bill_amount = request.POST.get("bill_amount")
            bill_description = request.POST.get("bill_description")
            bill_document = request.FILES.get("bill_document")

            # Get Organization instance (Fix: Use `get_object_or_404`)
            organization = get_object_or_404(OrganizationDetails, id=organization_id)

            # Create Bill record
            Bill.objects.create(
                organization=organization,
                bill_amount=bill_amount,
                bill_description=bill_description,
                bill_document=bill_document
            )
            return JsonResponse({"success": True, "message": "Bill submitted successfully!"})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return render(request, "bill-submission.html", {"organizations": organizations})
notify_admins("New bill submitted for approval.", "Alert", link="/admin/bill_approval/")

@csrf_exempt
def expense_entry(request):
    organizations = OrganizationDetails.objects.all()  

    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Validate required fields
            required_fields = ["organization_id", "category", "amount", "date"]
            for field in required_fields:
                if not data.get(field):
                    return JsonResponse({"success": False, "error": f"{field} is required!"}, status=400)

            # Get organization instance
            organization = OrganizationDetails.objects.get(id=data["organization_id"])

            # Create Expense entry
            Expense.objects.create(
                organization=organization,
                category=data["category"],
                amount=float(data["amount"]),
                date=data["date"],
                description=data.get("description", "")
            )

            return JsonResponse({"success": True, "message": "Expense added successfully!"})

        except OrganizationDetails.DoesNotExist:
            return JsonResponse({"success": False, "error": "Invalid organization!"}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "Invalid JSON format!"}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return render(request, "expense-entry.html", {"organizations": organizations})

@csrf_exempt  # Only for testing; use CSRF protection in production
def grant_allocation(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))  # Decode JSON request
            organization_id = data.get("organization_id")
            grant_amount = data.get("grant_amount")
            allocation_date = data.get("allocation_date")

            # Debugging - Check received data in Django console
            print("Received Data:", data)

            # Fetch organization instance
            organization = OrganizationDetails.objects.get(id=organization_id)

            # Store data in the database
            allocation = GrantAllocation.objects.create(
                organization=organization,
                amount=grant_amount,
                allocation_date=allocation_date
            )

            return JsonResponse({"success": True, "allocation_id": allocation.id}, status=201)

        except OrganizationDetails.DoesNotExist:
            return JsonResponse({"success": False, "error": "Organization not found"}, status=400)

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    # If GET request, render the template with data
    organizations = OrganizationDetails.objects.all()
    allocations = GrantAllocation.objects.all()
    return render(request, "grant-allocation.html", {"organizations": organizations, "allocations": allocations})

def get_funds_data(request):
    # Get total allocated
    total_allocated = GrantAllocation.objects.aggregate(total=Sum('amount'))['total'] or 0

    # Get total expenses
    total_utilized = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0

    # Calculate remaining
    remaining_funds = total_allocated - total_utilized

    return JsonResponse({
        "available_funds": remaining_funds,
        "grants_allocated": total_allocated,
        "grants_utilized": total_utilized
    })

def notification(request):
    return render(request,'notifications.html')

logger = logging.getLogger(__name__)


@login_required
def get_notifications(request):
    if request.user.is_staff:
        notifications = Notification.objects.filter(target_audience='admin').order_by('-date')
    else:
        notifications = Notification.objects.filter(user=request.user, target_audience='user').order_by('-date')

    data = []
    for n in notifications:
        data.append({
            
            'id': n.id,
            'message': n.message,
            'type': n.type,
            'status': n.status,
            'link': n.link or '',
            'is_read': n.is_read,
            'date': date_format(n.date, 'Y-m-d H:i'),
        })

    return JsonResponse(data, safe=False)


@login_required
def user_notifications_view(request):
    notifications = Notification.objects.filter(target_audience='user')
    return render(request, 'user_notifications.html', {'notifications': notifications})

@login_required
def admin_notifications_view(request):
    notifications = Notification.objects.filter(target_audience='admin')
    return render(request, 'admin_notifications.html', {'notifications': notifications})

def mark_notification_as_read(request, id):
    if request.method == "POST":
        try:
            notification = Notification.objects.get(id=id)
            notification.is_read = True
            notification.status = 'Read'
            notification.save()
            return JsonResponse({'success': True})
        except Notification.DoesNotExist:
            return JsonResponse({'error': 'Notification not found'}, status=404)
    return HttpResponseNotAllowed(['POST'])

def delete_notification(request, id):
    if request.method == "POST":
        try:
            notification = Notification.objects.get(id=id)
            notification.delete()
            return JsonResponse({'success': True})
        except Notification.DoesNotExist:
            return JsonResponse({'error': 'Notification not found'}, status=404)
    return HttpResponseNotAllowed(['POST'])

@csrf_exempt
def organization(request):
    if request.method == "GET":
        return render(request, 'organization-management.html')

    elif request.method == "POST":
        try:
            data = json.loads(request.body)  # JSON Parse
            print("Received Data:", data)  # Debugging ke liye print kar raha hu

            # ✅ Required fields check
            required_fields = ["organization_name", "address", "contact", "email", "phone", "budget"]
            for field in required_fields:
                if field not in data or not data[field]:
                    return JsonResponse({"success": False, "error": f"Missing field: {field}"}, status=400)

            # ✅ Save to Database (name ko organization_name se map kiya)
            org = OrganizationDetails.objects.create(
                organization_name=data['organization_name'],  # Yeh "name" ko "organization_name" me map karega
                address=data['address'],
                contact=data['contact'],
                email=data['email'],
                phone=data['phone'],
                budget=float(data['budget'])
            )

            return JsonResponse({"success": True, "organization": {"id": org.id, "name": org.organization_name}}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "Invalid JSON format"}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request"}, status=400)

@login_required
def report(request):
    if request.method == "POST":
        report_type = request.POST.get("report_type")
        org_id = request.POST.get("organization")  # Ensure it matches <select name="organization">
        start_date = request.POST.get("start_date")
        end_date = request.POST.get("end_date")
        report_format = request.POST.get("report_format")

        filters = {}
        if org_id and org_id != "all":
            filters["organization_id"] = org_id
        if start_date and end_date:
            filters["allocation_date__range"] = (start_date, end_date)

        data = GrantAllocation.objects.filter(**filters)

        # Validate report_type in case REPORT_TYPE_CHOICES is missing
        report_name = f"{dict(getattr(ReportHistory, 'REPORT_TYPE_CHOICES', {})).get(report_type, 'Custom')} Report"

        # Save report history
        ReportHistory.objects.create(
            report_name=report_name,
            generated_by=request.user,
            report_format=report_format,
            report_type=report_type,
        )

        # Generate report based on format
        if report_format == "pdf":
            return generate_pdf_report(data)
        elif report_format == "excel":
            return generate_excel_report(data)
        elif report_format == "csv":
            return generate_csv_report(data)

    # Fetch recent reports & organizations
    recent_reports = ReportHistory.objects.order_by("-generated_on")[:5]
    organizations = OrganizationDetails.objects.all()  # Fetch all organizations

    return render(request, "report-generation.html", {
        "recent_reports": recent_reports,
        "organizations": organizations,  # Pass organizations for the dropdown
    })

def admin_dashboard_data(request):
    if request.user.is_authenticated and request.user.is_staff:
        pending_bills = Bill.objects.filter(status='pending').count()
        approved_bills = Bill.objects.filter(status='approved').count()
        rejected_bills = Bill.objects.filter(status='rejected').count()

        total_allocated = GrantAllocation.objects.aggregate(total_amount=Sum('amount'))['total_amount'] or 0
        total_utilized = 0  # Still placeholder
        total_remaining = total_allocated - total_utilized

        org_count = OrganizationDetails.objects.count()

        data = {
            'pending_bills': pending_bills,
            'grants_total': total_allocated,
            'grants_utilized': total_utilized,
            'grants_remaining': total_remaining,
            'organization_count': org_count,
            'bill_status': {
                'pending': pending_bills,
                'approved': approved_bills,
                'rejected': rejected_bills,
            }
        }
        return JsonResponse(data)
    else:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    
def get_organizations(request):
    organizations = OrganizationDetails.objects.values('id', 'organization_name', 'address', 'contact', 'email', 'phone', 'budget')

    return JsonResponse({'organizations': list(organizations)})

@csrf_exempt
def edit_organization(request, org_id):
    organization = get_object_or_404(OrganizationDetails, pk=org_id)

    if request.method == "GET":
        # Render form with current org data
        return render(request, 'edit_organization.html', {'organization': organization})

    if request.method == "POST" and request.headers.get('Content-Type') == 'application/json':
        try:
            data = json.loads(request.body)

            organization.address = data.get("address", organization.address)
            organization.contact = data.get("contact_person", organization.contact)
            organization.email = data.get("email", organization.email)
            organization.phone = data.get("phone", organization.phone)
            organization.budget = data.get("budget", organization.budget)
            organization.save()

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)
@csrf_exempt
def deactivate_organization(request, org_id):
    if request.method == 'POST':
        try:
            org = OrganizationDetails.objects.get(id=org_id)
            org.is_active = False  # ✅ Make sure this field exists
            org.save()
            return JsonResponse({'success': True})
        except OrganizationDetails.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Organization not found'}, status=404)
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)