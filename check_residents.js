const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envConfig = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
    auth: { persistSession: false }
});

async function checkAllResidents() {
    try {
        console.log('Fetching profiles...');
        // Query profiles directly (or test with admin user if RLS applies)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, id_document_url, sectors, created_at')
            .order('created_at', { ascending: false });

        console.log('Error:', error);
        console.log('Profiles Found:', data ? data.length : 0);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

checkAllResidents();
