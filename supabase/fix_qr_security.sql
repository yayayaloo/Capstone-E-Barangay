-- =============================================
-- QR Verification Security Fix
-- Fixes: C3, C4, H4 from QR Verification Audit
-- Run this in Supabase SQL Editor
-- =============================================

-- Ensure the resident_qr_id column exists on public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resident_qr_id TEXT UNIQUE DEFAULT gen_random_uuid();

-- Backfill resident_qr_id for existing profiles if they are still NULL
UPDATE public.profiles
SET resident_qr_id = gen_random_uuid()
WHERE resident_qr_id IS NULL;



-- C3: Secure verify_document_qr — Require authentication before QR lookup
-- This prevents unauthenticated users from enumerating QR codes to extract PII
DROP FUNCTION IF EXISTS public.verify_document_qr(TEXT);

CREATE OR REPLACE FUNCTION public.verify_document_qr(qr_code_string TEXT)
RETURNS jsonb AS $$
DECLARE
    found_profile RECORD;
    found_request RECORD;
BEGIN
    -- SECURITY: Require authentication
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'isValid', false,
            'message', 'Authentication required to verify QR codes.'
        );
    END IF;

    -- Check if it's a resident profile QR (by id or resident_qr_id)
    SELECT p.id, p.full_name, p.resident_id_number, p.is_verified 
    INTO found_profile
    FROM public.profiles p
    WHERE p.id::text = qr_code_string
       OR p.resident_qr_id = qr_code_string;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'isValid', found_profile.is_verified,
            'type', 'Barangay Identification',
            'details', jsonb_build_object(
                'Holder Name', found_profile.full_name,
                'Resident ID', COALESCE(found_profile.resident_id_number, 'Pending'),
                'Verification Status', CASE WHEN found_profile.is_verified THEN 'Verified Resident' ELSE 'Unverified' END
            ),
            'message', CASE WHEN found_profile.is_verified THEN 'Valid Resident ID recognized.' ELSE 'Resident account is not yet verified.' END
        );
    END IF;

    -- Check if it's a service request / document
    SELECT sr.id, sr.document_type, sr.purpose, sr.status, sr.created_at, sr.expires_at, p.full_name as holder_name
    INTO found_request
    FROM public.service_requests sr
    JOIN public.profiles p ON p.id = sr.resident_id
    WHERE sr.qr_code_ref = qr_code_string;

    IF FOUND THEN
        DECLARE
            v_is_valid BOOLEAN;
            v_message TEXT;
        BEGIN
            v_is_valid := found_request.status IN ('completed', 'ready');
            
            -- Expiration check
            IF v_is_valid AND found_request.expires_at IS NOT NULL AND found_request.expires_at < NOW() THEN
                v_is_valid := false;
                v_message := 'Document has expired.';
            ELSIF v_is_valid THEN
                v_message := 'Valid official barangay document recognized.';
            ELSE
                v_message := 'Document status is ' || INITCAP(found_request.status) || '.';
            END IF;

            RETURN jsonb_build_object(
                'isValid', v_is_valid,
                'type', found_request.document_type,
                'details', jsonb_build_object(
                    'Holder Name', found_request.holder_name,
                    'Purpose', COALESCE(found_request.purpose, 'N/A'),
                    'Status', INITCAP(found_request.status),
                    'Date Issued', TO_CHAR(found_request.created_at, 'YYYY-MM-DD'),
                    'Expires At', COALESCE(TO_CHAR(found_request.expires_at, 'YYYY-MM-DD'), 'N/A')
                ),
                'message', v_message
            );
        END;
    END IF;

    -- Not found
    RETURN jsonb_build_object(
        'isValid', false,
        'message', 'QR Code is not recognized by the E-Barangay system.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- C4 + H4: Secure log_qr_verification — Require authentication & force verified_by
-- This prevents unauthenticated audit trail pollution and admin impersonation
DROP FUNCTION IF EXISTS public.log_qr_verification(TEXT, TEXT, TEXT, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION public.log_qr_verification(
    p_document_ref TEXT,
    p_document_type TEXT,
    p_holder_name TEXT,
    p_is_valid BOOLEAN,
    p_verified_by UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- SECURITY: Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to log QR verifications.';
    END IF;

    -- H4: Always use the authenticated user's ID — ignore client-supplied p_verified_by
    -- This prevents impersonation of other users in the audit trail
    INSERT INTO qr_verifications (document_ref, document_type, holder_name, is_valid, verified_by)
    VALUES (p_document_ref, p_document_type, p_holder_name, p_is_valid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
