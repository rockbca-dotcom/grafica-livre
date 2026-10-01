-- Evita resolução de objetos pelo search_path do chamador.
alter function public.proximo_numero_documento(text) set search_path = '';
