from django.contrib import admin
from .models import OrganizationDetails,Expense,Bill,GrantAllocation,ReportHistory

# Register your models here.
admin.site.register(OrganizationDetails)
admin.site.register(Expense)
admin.site.register(Bill)
admin.site.register(GrantAllocation)
admin.site.register(ReportHistory)
