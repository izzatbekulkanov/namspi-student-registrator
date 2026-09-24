from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from members.views import CustomLoginView

urlpatterns = [
    path('', CustomLoginView.as_view(), name='login'), # Root URL: Login sahifasi
    path('login/', CustomLoginView.as_view(), name='login_direct'),
    path('api/', include('api.urls')),                  # API marshrutlari
    path('admin/', admin.site.urls),                    # Django admin
    path('', include('queueing.urls')),                 # Display va navbat
    path('staff/', include('members.urls')),            # Hodimlar boshqaruvi
    path('registrator/', include('registrator.urls')),  # Registrator bo‘limi
]

# # Faqat DEBUG holatda browser reload yo‘llarini qo‘shish
# if settings.DEBUG:
#     urlpatterns += [
#         path("__reload__/", include("django_browser_reload.urls")),
#     ]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)