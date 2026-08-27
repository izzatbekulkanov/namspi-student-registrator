# queueing/views.py
import string
from itertools import product

from django.contrib.auth.decorators import login_required
from django.utils.timezone import now
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse

from members.models import DailyWorkWindow
from registrator.models import SubService, Section
from .models import QueueTicket
from django.template.loader import render_to_string
import json


def section_list_view(request):
    sections = Section.objects.all()
    return render(request, 'queueing/queueing_order_list.html', {'sections': sections})

def section_trial_view(request):
    sections = Section.objects.all()
    return render(request, 'queueing/trieal.html', {'sections': sections})


def subservice_list_view(request, section_id):
    section = get_object_or_404(Section, id=section_id)
    subservices = SubService.objects.filter(section=section)
    return render(request, 'queueing/queueing_subservice_list.html', {'section': section, 'subservices': subservices})






def queueing_create_ticket_ajax(request, subservice_id):
    from django.db import IntegrityError

    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        subservice = get_object_or_404(SubService, pk=subservice_id)

        # Faqat bugungi kundagi navbatlar sonini hisoblaymiz
        today_count = QueueTicket.objects.filter(created_at__date=now().date()).count()

        # Global ketma-ket navbat raqami
        ticket_number = f"{today_count + 1:04d}"  # Masalan: 0001

        try:
            ticket = QueueTicket.objects.create(
                service=subservice,
                ticket_number=ticket_number
            )

            return JsonResponse({
                "success": True,
                "ticket_number": ticket.ticket_number,
                "service_name": subservice.name,
                "section_name": subservice.section.name,
                "created_at": ticket.created_at.strftime('%H:%M:%S %d.%m.%Y'),
            })

        except IntegrityError:
            return JsonResponse({"success": False, "error": "Chipta raqami takrorlanmoqda."}, status=400)

    return JsonResponse({"success": False}, status=400)


def queue_display_view(request):
    return render(request, 'queueing/queueing_display.html')


def ajax_operator_serving_tickets(request):
    today = now().date()

    # Hozir xizmat ko‘rsatilayotgan barcha navbatlar (serving)
    serving_tickets = QueueTicket.objects.filter(
        status='serving'
    ).select_related('served_by', 'service', 'service__section').order_by('-started_at', '-created_at')

    ticket_data = []

    for ticket in serving_tickets:
        # Operatorning bugungi oyna raqamini aniqlash
        operator_window = None
        if ticket.served_by:
            try:
                window = DailyWorkWindow.objects.filter(operator=ticket.served_by, date=today).first()
                if window:
                    operator_window = window.window_number
            except Exception:
                pass

        ticket_data.append({
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'window_number': ticket.window_number or operator_window,
            'service_name': ticket.service.name if ticket.service else "",
            'operator_name': ticket.served_by.get_full_name() if ticket.served_by else "Noma'lum"
        })

    return JsonResponse({'tickets': ticket_data})


