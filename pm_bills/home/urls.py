from django.contrib import admin
from django.urls import path,include
from home import views
from django.conf import settings
from django.conf.urls.static import static



urlpatterns = [
    #path('admin/', admin.site.urls),
    path('',views.index,name='index'),
    path('login/',views.login_view,name='login'),
    path('user_dashboard/',views.user_dashboard,name='user_dashboard'),
    path('api/user-dashboard/', views.user_dashboard_api, name='user_dashboard_api'),
    path('api/bills/', views.api_bills, name='api_bills'),
    path('api/expenses/', views.api_expenses, name='api_expenses'),
    path('api/organization/', views.api_organization, name='api_organization'),
    path('api/notifications/', views.get_notifications),

    path('user_notifications/user', views.user_notifications_view, name='user_notifications'),
    path('admin_notifications/admin', views.admin_notifications_view, name='admin_notifications'),
    path('api/notifications/<int:id>/read/', views.mark_notification_as_read, name='mark_notification_as_read'),
    path('api/notifications/<int:id>/delete/', views.delete_notification, name='delete_notification'),

    path('admin_dashboard/',views.admin_dashboard,name='admin_dashboard'),
    path('api/admin-dashboard-data/', views.admin_dashboard_data, name='admin_dashboard_data'),
    path('bill_approval/',views.bill_approval,name='bill_approval'),
    path('bill_submission/',views.bill_submission,name='bill_submission'),
    path('expense_entry/',views.expense_entry,name='expense_entry'),
    path('grant_allocation/',views.grant_allocation,name='grant_allocation'),
    path('api/funds/', views.get_funds_data, name='get_funds_data'),
    
    path('notification/',views.notification,name='notification'),
    path('organization/',views.organization,name='organization'),
    path('api/organizations/', views.get_organizations, name='get_organizations'),
    path('organization/edit/<int:org_id>/', views.edit_organization, name='edit_organization'),
    path('api/organization/edit/<int:id>/', views.edit_organization, name='edit_organization'),
    path('api/organizations/deactivate/<int:org_id>/', views.deactivate_organization, name='deactivate_organization'),
    path('report/',views.report,name='report'),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)