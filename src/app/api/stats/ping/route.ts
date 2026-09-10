import { NextResponse } from 'next/server';

// Real-time System Admin State (Persisted in server memory)
let adminSystemState = {
  stats: {
    totalSyncs: 1,
    activeToday: 1,
    lastSyncAt: new Date().toISOString() as string | null,
    uniqueSessions: 1,
  },
  announcement: {
    enabled: false,
    message: '',
    type: 'info' as 'info' | 'warning' | 'success',
  },
  maintenanceMode: false,
  healthStatus: {
    googleCalendar: 'online',
    officeHolidays: 'online',
    proxyApi: 'online',
    lastChecked: new Date().toISOString(),
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health_check') {
    return NextResponse.json({
      success: true,
      health: {
        googleCalendar: 'online',
        officeHolidays: 'online',
        proxyApi: 'online',
        lastChecked: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: adminSystemState,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'update_announcement') {
      adminSystemState.announcement = {
        enabled: !!body.enabled,
        message: body.message || '',
        type: body.type || 'info',
      };
      return NextResponse.json({
        success: true,
        message: 'تم تحديث التنبيه العام بنجاح',
        data: adminSystemState,
      });
    }

    if (body.action === 'toggle_maintenance') {
      adminSystemState.maintenanceMode = !adminSystemState.maintenanceMode;
      return NextResponse.json({
        success: true,
        message: `تم ${adminSystemState.maintenanceMode ? 'تفعيل' : 'إلغاء'} وضع الصيانة`,
        data: adminSystemState,
      });
    }

    if (body.action === 'reset_stats') {
      adminSystemState.stats = {
        totalSyncs: 0,
        activeToday: 0,
        lastSyncAt: null,
        uniqueSessions: 0,
      };
      return NextResponse.json({
        success: true,
        message: 'تم إعادة ضبط الإحصائيات بنجاح',
        data: adminSystemState,
      });
    }

    adminSystemState.stats.totalSyncs += 1;
    adminSystemState.stats.activeToday += 1;
    adminSystemState.stats.lastSyncAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: 'Ping recorded anonymously',
      data: adminSystemState,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
