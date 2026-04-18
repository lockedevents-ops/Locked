
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to parse Prometheus text format
// Matches: KEY 12.34  OR  KEY{label="val"} 12.34
function parsePrometheusValue(text: string, metricName: string): number | null {
  // Regex: Start of line, MetricName, Optional {labels}, Whitespace, Value (Capture)
  const regex = new RegExp(`^${metricName}(?:\\{[^}]*\\})?\\s+([0-9.]+)`, 'm');
  const match = text.match(regex);
  return match ? parseFloat(match[1]) : null;
}

function parsePrometheusRegex(text: string, regex: RegExp): number | null {
  const match = text.match(regex);
  return match ? parseFloat(match[1]) : null;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  
  if (!projectRef && supabaseUrl) {
    try {
        const urlParts = supabaseUrl.split('//')[1]; 
        projectRef = urlParts.split('.')[0];
    } catch (e) {
        console.error('[MetricsAPI] Failed to parse project ref from URL:', supabaseUrl);
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!projectRef || !serviceRoleKey) {
     return NextResponse.json(
      { error: 'Supabase credentials (Project ID or Service Role Key) not configured' },
      { status: 501 }
    );
  }

  try {
    const url = `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`;
    const credentials = btoa(`service_role:${serviceRoleKey}`);
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}` },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Metrics fetch failed: ${res.status} ${errText}`);
    }

    const text = await res.text();

    // --- PARSING LOGIC ---
    
    // 1. Memory Usage %
    const memTotal = parsePrometheusValue(text, 'node_memory_MemTotal_bytes');
    const memAvailable = parsePrometheusValue(text, 'node_memory_MemAvailable_bytes');
    
    let memoryUsagePercent = null;
    if (memTotal && memAvailable && memTotal > 0) {
        memoryUsagePercent = ((memTotal - memAvailable) / memTotal) * 100;
    }

    // 2. CPU / Load
    const load1 = parsePrometheusValue(text, 'node_load1');

    // 3. Storage
    // For storage we need specific mountpoints, so we keep using manual regex for precision
    // (The helper handles generic keys, but not specific label filtering)
    let diskTotal = parsePrometheusRegex(text, /^node_filesystem_size_bytes\{[^}]*mountpoint="\/data"[^}]*\}\s+([0-9.]+)/m);
    let diskFree = parsePrometheusRegex(text, /^node_filesystem_free_bytes\{[^}]*mountpoint="\/data"[^}]*\}\s+([0-9.]+)/m);

    // Fallback to root if data mount not found
    if (!diskTotal) {
         diskTotal = parsePrometheusRegex(text, /^node_filesystem_size_bytes\{[^}]*mountpoint="\/"[^}]*\}\s+([0-9.]+)/m);
         diskFree = parsePrometheusRegex(text, /^node_filesystem_free_bytes\{[^}]*mountpoint="\/"[^}]*\}\s+([0-9.]+)/m);
    }
    
    let diskUsagePercent = null;
    if (diskTotal && diskFree && diskTotal > 0) {
        diskUsagePercent = ((diskTotal - diskFree) / diskTotal) * 100;
    }

    // 4. Connections (Sum of all backends)
    let activeConnections = 0;
    const connRegex = /^pg_stat_database_numbackends\{[^}]*\}\s+([0-9.]+)/gm;
    let match;
    while ((match = connRegex.exec(text)) !== null) {
        activeConnections += parseFloat(match[1]);
    }
    // If no postgres stats found, fallback to pgbouncer or 0
    if (activeConnections === 0) {
        const pgbouncer = parsePrometheusValue(text, 'pgbouncer_pools_server_active_cancel_connections');
        if (pgbouncer !== null) activeConnections = pgbouncer;
    }

    return NextResponse.json({
      cpu: load1, 
      memory: memoryUsagePercent,
      storageUsage: diskUsagePercent,
      activeConnections,
      status: 'operational'
    });

  } catch (error: any) {
    console.error('Supabase Metrics API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
