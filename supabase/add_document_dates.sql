-- Run this script in your Supabase SQL Editor to add explicit date tracking for documents

-- 1. Add columns to service_requests table
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Update the verify_document_qr RPC function to handle expiration checking
DROP FUNCTION IF EXISTS public.verify_document_qr(TEXT);

CREATE OR REPLACE FUNCTION public.verify_document_qr(p_qr_ref TEXT)
RETURNS JSON AS $$
DECLARE
    v_req RECORD;
    v_profile RECORD;
    v_is_valid BOOLEAN;
BEGIN
    SELECT * INTO v_req FROM public.service_requests WHERE qr_code_ref = p_qr_ref LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('is_valid', false, 'message', 'Invalid QR code');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_req.resident_id LIMIT 1;

    -- Check if document is still valid and not expired
    v_is_valid := (v_req.status = 'ready' OR v_req.status = 'completed');
    
    IF v_is_valid AND v_req.expires_at IS NOT NULL AND v_req.expires_at < NOW() THEN
        v_is_valid := false;
    END IF;

    -- Insert into qr_verifications (which acts as an audit log)
    INSERT INTO public.qr_verifications (qr_code_ref, scanned_by, is_valid, holder_name, document_type)
    VALUES (p_qr_ref, NULL, v_is_valid, v_profile.full_name, v_req.document_type);

    IF v_is_valid THEN
        RETURN json_build_object(
            'is_valid', true,
            'holder_name', v_profile.full_name,
            'document_type', v_req.document_type,
            'issued_at', v_req.issued_at,
            'expires_at', v_req.expires_at,
            'message', 'Document is verified and authentic'
        );
    ELSE
        IF v_req.expires_at IS NOT NULL AND v_req.expires_at < NOW() THEN
             RETURN json_build_object(
                'is_valid', false,
                'holder_name', v_profile.full_name,
                'document_type', v_req.document_type,
                'issued_at', v_req.issued_at,
                'expires_at', v_req.expires_at,
                'message', 'Document has expired'
            );
        ELSE
            RETURN json_build_object(
                'is_valid', false, 
                'holder_name', v_profile.full_name,
                'document_type', v_req.document_type,
                'issued_at', v_req.issued_at,
                'expires_at', v_req.expires_at,
                'message', 'Document status is ' || v_req.status
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
