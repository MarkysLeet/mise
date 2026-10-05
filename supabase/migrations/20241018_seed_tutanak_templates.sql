DO $$
DECLARE
    ws RECORD;
BEGIN
    FOR ws IN SELECT id FROM workspaces LOOP
        -- Hastalık - Haber Verdi
        IF NOT EXISTS (SELECT 1 FROM tutanak_templates WHERE workspace_id = ws.id AND category = 'Devamsizlik' AND title = 'Hastalık - Haber Verdi') THEN
            INSERT INTO tutanak_templates (workspace_id, category, title, content)
            VALUES (
                ws.id,
                'Devamsizlik',
                'Hastalık - Haber Verdi',
                '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) rahatsızlandığını ve işe gelemeyeceğini önceden bildirmiştir. Bu tutanak, personelin haberli devamsızlığını kayıt altına almak amacıyla düzenlenmiştir.'
            );
        END IF;

        -- Hastalık - Haber Vermedi
        IF NOT EXISTS (SELECT 1 FROM tutanak_templates WHERE workspace_id = ws.id AND category = 'Devamsizlik' AND title = 'Hastalık - Haber Vermedi') THEN
            INSERT INTO tutanak_templates (workspace_id, category, title, content)
            VALUES (
                ws.id,
                'Devamsizlik',
                'Hastalık - Haber Vermedi',
                '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesaisine gelmemiş ve mazeret bildirmemiştir. Personelin habersiz devamsızlığı tespit edilmiş olup, işbu tutanak imza altına alınmıştır.'
            );
        END IF;

        -- Geç Kalma
        IF NOT EXISTS (SELECT 1 FROM tutanak_templates WHERE workspace_id = ws.id AND category = 'Devamsizlik' AND title = 'İşe Geç Kalma') THEN
            INSERT INTO tutanak_templates (workspace_id, category, title, content)
            VALUES (
                ws.id,
                'Devamsizlik',
                'İşe Geç Kalma',
                '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesai saatine uymamış ve işe geç kalmıştır. Personelin gecikmesi tespit edilmiş olup bu tutanak düzenlenmiştir.'
            );
        END IF;

        -- İzinsiz Görev Yeri Terki
        IF NOT EXISTS (SELECT 1 FROM tutanak_templates WHERE workspace_id = ws.id AND category = 'Devamsizlik' AND title = 'İzinsiz Görev Yeri Terki') THEN
            INSERT INTO tutanak_templates (workspace_id, category, title, content)
            VALUES (
                ws.id,
                'Devamsizlik',
                'İzinsiz Görev Yeri Terki',
                '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesai saatleri içerisinde amirinden izin almaksızın görev yerini terk etmiştir. Bu durum tespit edilmiş olup işbu tutanak düzenlenmiştir.'
            );
        END IF;
    END LOOP;
END $$;
