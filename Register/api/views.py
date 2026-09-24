from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from registrator.models import Section, SubService
from queueing.models import QueueTicket

class SectionListAPI(APIView):
    def get(self, request):
        sections = Section.objects.all().values('id', 'name', 'description')
        return Response({"sections": list(sections)})


class SubserviceListAPI(APIView):
    def get(self, request, pk):
        section = get_object_or_404(Section, pk=pk)
        subservices = SubService.objects.filter(section=section).values('id', 'name', 'description')
        return Response({
            "section": section.name,
            "subservices": list(subservices)
        })


class CreateTicketAPI(APIView):
    def post(self, request, subservice_id):
        # SubService mavjudligini tekshirish
        subservice = get_object_or_404(SubService, pk=subservice_id)

        # Bugungi navbatlar soni (butun tizim bo‘yicha)
        today = now().date ()
        today_count = QueueTicket.objects.filter(created_at__date=today).count()

        # Global formatdagi navbat raqami: 0001, 0002, ...
        ticket_number = f"{today_count + 1:04d}"

        try:
            ticket = QueueTicket.objects.create(
                service=subservice,
                ticket_number=ticket_number
            )

            return Response({
                "success": True,
                "ticket_number": ticket.ticket_number,
                "subservice_name": subservice.name,
                "section_name": subservice.section.name,
                "created_at": ticket.created_at.strftime('%H:%M:%S %d.%m.%Y'),
            }, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response({
                "success": False,
                "error": "Chipta raqami takrorlanmoqda."
            }, status=status.HTTP_400_BAD_REQUEST)


class TodayTicketSummaryAPI(APIView):
    def get(self, request):
        today = now().date()
        queryset = QueueTicket.objects.filter(created_at__date=today)

        grouped = {
            "waiting": [],
            "serving": [],
            "done": [],
        }

        for ticket in queryset:
            item = {
                "ticket_number": ticket.ticket_number,
                "status": ticket.status,
                "created_at": ticket.created_at.strftime("%H:%M:%S"),
                "window_number": ticket.window_number,
                "started_at": ticket.started_at.strftime("%H:%M:%S") if ticket.started_at else None,
                "ended_at": ticket.ended_at.strftime("%H:%M:%S") if ticket.ended_at else None,
                "result": ticket.result,
                "served_by": ticket.served_by.get_full_name() if ticket.served_by else None,
                "service_name": ticket.service.name,
                "section_name": ticket.service.section.name,
            }

            if ticket.status in grouped:
                grouped[ticket.status].append(item)
            else:
                grouped["waiting"].append(item)  # fallback

        return Response({
            "date": today.strftime("%Y-%m-%d"),
            "counts": {
                "waiting": len(grouped["waiting"]),
                "serving": len(grouped["serving"]),
                "done": len(grouped["done"]),
            },
            "tickets": grouped
        })


class ServingTicketListAPI(APIView):
    def get(self, request):
        today = now().date()

        # Bugungi "serving" statusdagi chiptalar
        tickets = QueueTicket.objects.filter(
            status="serving"
        ).select_related('served_by', 'service', 'service__section').order_by('started_at', 'created_at')

        results = []
        for ticket in tickets:
            duration_seconds = None
            if ticket.started_at:
                duration_seconds = int((now() - ticket.started_at).total_seconds())

            # Oyna raqamini aniqlash (ticket maydonida bo‘lmasa, DailyWorkWindow dan olish)
            window_number = ticket.window_number
            if not window_number and ticket.served_by:
                try:
                    work_window = DailyWorkWindow.objects.filter(operator=ticket.served_by, date=today).first()
                    if work_window:
                        window_number = work_window.window_number
                except Exception:
                    pass

            results.append({
                "id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "window_number": window_number,
                "started_at": ticket.started_at.strftime('%H:%M:%S') if ticket.started_at else None,
                "duration_seconds": duration_seconds,
                "operator": {
                    "id": ticket.served_by.id if ticket.served_by else None,
                    "full_name": ticket.served_by.get_full_name() if ticket.served_by else None,
                    "username": ticket.served_by.username if ticket.served_by else None,
                },
                "service": {
                    "id": ticket.service.id if ticket.service else None,
                    "name": ticket.service.name if ticket.service else "",
                    "section": ticket.service.section.name if (ticket.service and ticket.service.section) else "",
                },
                "notes": ticket.notes or ""
            })

        return Response({
            "count": len(results),
            "serving_tickets": results
        })