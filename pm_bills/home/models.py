from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import AbstractUser
# Create your models here.

#username : rathod_asmita password : rathod123
#username : user password : user123
#username : admin password : admin123
class OrganizationDetails(models.Model):  # Use PascalCase for model names
    user = models.OneToOneField(User, on_delete=models.CASCADE,null=True, blank=True)
    organization_name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    contact = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True) 

    def __str__(self):
        return self.organization_name
    
class Expense(models.Model):  # Expense model
    CATEGORY_CHOICES = [
        ('food', 'Food'),
        ('transport', 'Transportation'),
        ('maintenance', 'Maintenance'),
        ('staff', 'Staff Salary'),
        ('equipment', 'Equipment'),
        ('utilities', 'Utilities'),
        ('other', 'Other'),
    ]

    organization = models.ForeignKey(OrganizationDetails, on_delete=models.CASCADE)  # Corrected reference
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.organization.organization_name} - {self.category} - ₹{self.amount}"
    
class Bill(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True)
    organization = models.ForeignKey(OrganizationDetails, on_delete=models.CASCADE)
    bill_amount = models.DecimalField(max_digits=10, decimal_places=2)
    bill_description = models.TextField()
    bill_document = models.FileField(upload_to="bills/", blank=True, null=True)
    submission_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')  # ✅ New field

    def __str__(self):
        return f"Bill {self.id} - {self.organization.organization_name} - {self.status}"
    
class GrantAllocation(models.Model):
    organization = models.ForeignKey(OrganizationDetails, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    allocation_date = models.DateField()

    def __str__(self):
        return f"Grant of ₹{self.amount} allocated to {self.organization.organization_name} on {self.allocation_date}"
    
class ReportHistory(models.Model):
    REPORT_FORMAT_CHOICES = [
        ("pdf", "PDF"),
        ("excel", "Excel"),
        ("csv", "CSV"),
    ]

    REPORT_TYPE_CHOICES = [
        ("mis", "MIS Report"),
        ("monthly", "Monthly Patrak"),
        ("expenditure", "Expenditure Report"),
        ("allocation", "Grant Allocation Report"),
        ("summary", "Summary Report"),
    ]

    report_name = models.CharField(max_length=255)
    generated_on = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    report_format = models.CharField(max_length=10, choices=REPORT_FORMAT_CHOICES)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)

    def __str__(self):
        return f"{self.report_name} ({self.report_format}) by {self.generated_by.username}"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('Info', 'Info'),
        ('Alert', 'Alert'),
        ('Warning', 'Warning'),
        ('Success', 'Success'),
    ]

    STATUS_CHOICES = [
        ('Unread', 'Unread'),
        ('Read', 'Read'),
    ]
    TARGET_AUDIENCE_CHOICES = [
          ('admin', 'Admin'),
          ('user', 'User'),
      ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications',null=True)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='Info')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Unread')
    date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True,null=True)
    target_audience = models.CharField(max_length=10, choices=TARGET_AUDIENCE_CHOICES,null=True)
    link = models.URLField(blank=True, null=True) 
    is_read = models.BooleanField(default=False) 

    def __str__(self):
        return f"{self.type} - {self.message[:30]}"
 