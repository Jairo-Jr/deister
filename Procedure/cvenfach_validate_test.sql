DROP PROCEDURE cvenfach_validate;
-- **************************************************************************
-- cvenfach_validate
-- DEISTER WebStudio XSQL-UDFUNC  -  Engine: informix
-- **************************************************************************
CREATE PROCEDURE cvenfach_validate(
    p_facidx integer
)

    RETURNING
        decimal (14,6) AS o_totiva
        ,decimal (14,6) AS o_totret
        ,decimal (14,6) AS o_totdet
    ;
    -- =================================
    -- Definition of OUTPUT variables
    -- =================================
    DEFINE o_totiva LIKE cvenfach.impnet;
    DEFINE o_totret LIKE cvenfach.impnet;
    DEFINE o_totdet LIKE cvenfach.impnet;

    -- =================================
    -- Definition of variables
    -- =================================
    DEFINE cvenfach_facidx LIKE cvenfach.facidx;
    DEFINE cvenfach_empcode LIKE cvenfach.empcode;
    DEFINE cvenfach_contab LIKE cvenfach.contab;
    DEFINE cvenfach_dtocab LIKE cvenfach.dtocab;
    DEFINE cvenfach_imptot decimal(14,7);
    DEFINE cvenfach_impnet LIKE cvenfach.impnet;
    DEFINE cvenfach_fecfac LIKE cvenfach.fecfac;
    DEFINE cvenfach_fecope LIKE cvenfach.fecope;
    DEFINE cvenfach_zimdel LIKE cvenfach.zimdel;
    DEFINE cvenfach_zimter LIKE cvenfach.zimter;
    DEFINE cvenfach_tercer LIKE cvenfach.tercer;
    DEFINE cvenfach_grpfis LIKE cvenfach.grpfis;
    DEFINE cvenfach_dockey LIKE cvenfach.dockey;
    DEFINE cvenfach_ciftyp LIKE cvenfach.ciftyp;
    DEFINE ctercero_taxkey LIKE ctercero.taxkey;
    DEFINE ctertipo_aplret LIKE ctertipo.aplret;
    DEFINE cmonedas_tipred LIKE cmonedas.tipred;
    DEFINE cvenfach_net_amount LIKE cvenfach.impnet;
    DEFINE cvenfacl_linidx integer;
    DEFINE cvenfacl_codart LIKE cvenfacl.codart;
    DEFINE cvenfacl_totnet LIKE cvenfacl.totnet;
    DEFINE cvenfacl_tax_porded LIKE cvenfacl.tax_porded;
    DEFINE cvenfacl_tax_porpro LIKE ccomfacl.tax_porpro;
    DEFINE cvenfacl_tax_ctapro LIKE ccomfacl.tax_ctapro;
    DEFINE cvenfacl_tax_refere LIKE cvenfacl.tax_refere;
    DEFINE cvenfacl_tax_basimp1 LIKE cvenfacl.tax_basimp1;
    DEFINE cvenfacl_tax_oper1 LIKE cvenfacl.tax_oper1;
    DEFINE cvenfacl_tax_code1 LIKE cvenfacl.tax_code1;
    DEFINE cvenfacl_tax_rule1 LIKE cvenfacl.tax_rule1;
    DEFINE cvenfacl_tax_basimp2 LIKE cvenfacl.tax_basimp2;
    DEFINE cvenfacl_tax_oper2 LIKE cvenfacl.tax_oper2;
    DEFINE cvenfacl_tax_code2 LIKE cvenfacl.tax_code2;
    DEFINE cvenfacl_tax_rule2 LIKE cvenfacl.tax_rule2;
    DEFINE cvenfacl_tax_basimp3 LIKE cvenfacl.tax_basimp3;
    DEFINE cvenfacl_tax_oper3 LIKE cvenfacl.tax_oper3;
    DEFINE cvenfacl_tax_code3 LIKE cvenfacl.tax_code3;
    DEFINE cvenfacl_tax_rule3 LIKE cvenfacl.tax_rule3;
    DEFINE cvenfacl_tax_basimp4 LIKE cvenfacl.tax_basimp4;
    DEFINE cvenfacl_tax_oper4 LIKE cvenfacl.tax_oper4;
    DEFINE cvenfacl_tax_code4 LIKE cvenfacl.tax_code4;
    DEFINE cvenfacl_tax_rule4 LIKE cvenfacl.tax_rule4;
    DEFINE carticul_taxkey LIKE carticul.taxkey;
    DEFINE m_exist_refcat smallint;
    DEFINE m_tax_manual smallint;
    DEFINE m_tot_cuota decimal(14,7);
    DEFINE m_class_order LIKE ctax_class.class_order;
    DEFINE m_tmp_impnet decimal;
    DEFINE m_tmp_importe_limite integer;
    DEFINE m_detra_porcen LIKE ctax_type.type_porcen;
    DEFINE m_detra_porcen_max LIKE ctax_type.type_porcen;
    DEFINE m_detra_taxkey LIKE carticul.taxkey;
    DEFINE m_detra_codart LIKE carticul.codart;
    DEFINE m_tmp_origen LIKE cvenfach.auxnum5;
    DEFINE m_cant_oper1 integer;
    DEFINE m_ctax_type_porcen LIKE ctax_type.type_porcen;

    -- =========================================================
    -- Debug
    -- To activate debug mesages, call sdm_set_debug(1) or level
    -- =========================================================
    DEFINE GLOBAL gl_debug   SMALLINT DEFAULT 0;    -- DEBUG FLAG
    IF gl_debug > 1 THEN
        TRACE ON;
    END IF

    -- =================================
    -- Function body
    -- =================================
    LET m_tot_cuota = 0;
    LET o_totiva = 0;
    LET o_totret = 0;
    LET o_totdet = 0;
    LET m_exist_refcat = 0;
    LET m_detra_porcen = 0;
    LET m_detra_porcen_max = 0;
    LET m_detra_taxkey = NULL;

-- BEGIN INCLUDE FOR XUDP
-- dbms: ghq_crp_dev
-- code: cvenfach_validate
-- name: before
-- outs:  o_totiva, o_totret, o_totdet

-- NOT FOUND

-- END   INCLUDE FOR XUDP


    SELECT 
                cvenfach.facidx,
                cvenfach.contab,
                cvenfach.empcode,
                cvenfach.fecfac,
                cvenfach.fecope,
                cvenfach.zimdel,
                cvenfach.zimter,
                cvenfach.tercer,
                cvenfach.dtocab,
                cvenfach.grpfis,
                cvenfach.dockey,
                cvenfach.ciftyp,
                
                ctercero.taxkey,
                ctertipo.aplret,
                
                icon_get_divred(cvenfach.moneda) tipred, 
                
                (SELECT COUNT(*) 
                   FROM cvenfach_tax 
                  WHERE cvenfach_tax.facidx = cvenfach.facidx 
                    AND cvenfach_tax.tax_manual != 0) tax_manual,
                
                icon_get_imploc(0, cvenfach.empcode, cvenfach.moneda, TODAY, cvenfach.cambio, cvenfach.imptot) impnet,
                CASE 
                    WHEN (SELECT COUNT(DISTINCT carticul.taxkey)
                            FROM cvenfacl, carticul
                           WHERE cvenfacl.codart = carticul.codart AND
                                 cvenfacl.facidx = cvenfach.facidx AND
                                 carticul.taxkey = '027') = 1 THEN 400
                    ELSE 700 
                END importe_limite,
                    
                cvenfach.auxnum5
             INTO 
                cvenfach_facidx,
                cvenfach_contab,
                cvenfach_empcode,
                cvenfach_fecfac,
                cvenfach_fecope,
                cvenfach_zimdel,
                cvenfach_zimter,
                cvenfach_tercer,
                cvenfach_dtocab,
                cvenfach_grpfis,
                cvenfach_dockey,
                cvenfach_ciftyp,
                
                ctercero_taxkey,
                ctertipo_aplret,
                
                cmonedas_tipred,
                
                m_tax_manual,
                m_tmp_impnet,
                m_tmp_importe_limite,
                
                m_tmp_origen
            
           FROM cvenfach, 
                cempresa, 
                ctercero, 
                OUTER ctertipo 
          WHERE cvenfach.facidx  = p_facidx
            AND cvenfach.empcode = cempresa.empcode
            AND cvenfach.tercer  = ctercero.codigo
            AND ctertipo.codigo  = cvenfach.tercer
            AND ctertipo.cuenta  = cvenfach.cuenta
            AND cempresa.placon  = ctertipo.placon
            AND ctertipo.codtip  = 'C'
        ;
    IF cvenfach_facidx IS NULL THEN
      RAISE EXCEPTION -746, 0, 'Invoice with Id [' || p_facidx || '] not found.' ;
    END IF;
    IF cvenfach_contab IS NOT NULL THEN
      RETURN o_totiva, o_totret, o_totdet;
    END IF;
    LET cvenfach_impnet = 0;

    FOREACH
     SELECT 
                    cvenfacl.linidx, 
                    cvenfacl.codart, 
                    
                    cvenfacl.precio * cvenfacl.cantid * (100 - cvenfacl.dtolin) / 100 totnet,
                    cvenfacl.tax_porded,
                    cvenfacl.tax_refere, 
                    cvenfacl.tax_oper1, cvenfacl.tax_code1, 
                    cvenfacl.tax_oper2, cvenfacl.tax_code2,
                    cvenfacl.tax_oper3, cvenfacl.tax_code3, 
                    cvenfacl.tax_oper4, cvenfacl.tax_code4,
                    NVL(ctax_artkey_zone.zone_artk_taxkey, carticul.taxkey) taxkey,
                    (SELECT COUNT(DISTINCT b.tax_oper1) FROM cvenfacl b WHERE b.facidx = p_facidx) cant_oper1
                 INTO 
                    cvenfacl_linidx, 
                    cvenfacl_codart, 
                    cvenfacl_totnet,
                    cvenfacl_tax_porded,
                    cvenfacl_tax_refere,
                    cvenfacl_tax_oper1, cvenfacl_tax_code1,
                    cvenfacl_tax_oper2, cvenfacl_tax_code2,
                    cvenfacl_tax_oper3, cvenfacl_tax_code3,
                    cvenfacl_tax_oper4, cvenfacl_tax_code4,
                    carticul_taxkey,
                    m_cant_oper1
                
               FROM cvenfacl, carticul, ctax_artkey, OUTER ctax_artkey_zone
              WHERE cvenfacl.facidx = p_facidx
                AND carticul.codart = cvenfacl.codart
                AND carticul.taxkey = ctax_artkey.artk_code
                AND ctax_artkey.artk_nature != 'X'
                AND ctax_artkey_zone.zone_artk_codart = carticul.codart
                AND ctax_artkey_zone.zone_artk_taxzon = cvenfach_zimter
                AND cvenfach_fecope BETWEEN ctax_artkey_zone.zone_artk_vigini AND ctax_artkey_zone.zone_artk_vigfin
                 EXECUTE PROCEDURE cinvoicel_get_taxdata('cvenfacl',cvenfach_empcode,cvenfach_fecfac,cvenfach_fecope,cvenfach_zimdel,cvenfach_zimter,cvenfach_tercer,cvenfach_dtocab,cvenfach_grpfis,cvenfach_dockey,cvenfach_ciftyp,ctercero_taxkey,ctertipo_aplret,cvenfacl_codart,carticul_taxkey,cvenfacl_totnet,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL) INTO cvenfacl_tax_porded,cvenfacl_tax_porpro,cvenfacl_tax_ctapro,cvenfacl_tax_basimp1,cvenfacl_tax_oper1,cvenfacl_tax_code1,cvenfacl_tax_rule1,cvenfacl_tax_basimp2,cvenfacl_tax_oper2,cvenfacl_tax_code2,cvenfacl_tax_rule2,cvenfacl_tax_basimp3,cvenfacl_tax_oper3,cvenfacl_tax_code3,cvenfacl_tax_rule3,cvenfacl_tax_basimp4,cvenfacl_tax_oper4,cvenfacl_tax_code4,cvenfacl_tax_rule4;
     SELECT 
                    ctax_type.type_porcen
                 INTO 
                    m_ctax_type_porcen
                
               FROM ctax_type
              WHERE type_code = cvenfacl_tax_code1
            ;
     IF  (cvenfach_dockey = '01' OR cvenfach_dockey = '07' OR cvenfach_dockey = '08') AND (m_tmp_impnet <= m_tmp_importe_limite) THEN
       LET cvenfacl_tax_basimp4 = NULL;
       LET cvenfacl_tax_oper4 = NULL;
       LET cvenfacl_tax_code4 = NULL;
       LET cvenfacl_tax_rule4 = NULL;
       IF  (m_cant_oper1 > 1) AND (m_ctax_type_porcen != 0) THEN
         LET cvenfacl_tax_oper1 = 'VLSC';
         LET cvenfacl_tax_rule1 = '1000111';
       END IF;
     END IF;
     UPDATE cvenfacl
        SET totnet=cvenfacl_totnet,
            tax_porded=cvenfacl_tax_porded,
            tax_basimp1=cvenfacl_tax_basimp1,
            tax_oper1=cvenfacl_tax_oper1,
            tax_code1=cvenfacl_tax_code1,
            tax_rule1=cvenfacl_tax_rule1,
            tax_basimp2=cvenfacl_tax_basimp2,
            tax_oper2=cvenfacl_tax_oper2,
            tax_code2=cvenfacl_tax_code2,
            tax_rule2=cvenfacl_tax_rule2,
            tax_basimp3=cvenfacl_tax_basimp3,
            tax_oper3=cvenfacl_tax_oper3,
            tax_code3=cvenfacl_tax_code3,
            tax_rule3=cvenfacl_tax_rule3,
            tax_basimp4=cvenfacl_tax_basimp4,
            tax_oper4=cvenfacl_tax_oper4,
            tax_code4=cvenfacl_tax_code4,
            tax_rule4=cvenfacl_tax_rule4
      WHERE 
                    linidx = cvenfacl_linidx
                ;
     LET cvenfach_impnet = cvenfach_impnet + cvenfacl_totnet;
     IF cvenfacl_tax_refere IS NOT NULL THEN
       LET m_exist_refcat = 1;
     END IF;
     IF cvenfacl_tax_code4 IS NOT NULL THEN
       SELECT 
                            -type_porcen
                         INTO 
                            m_detra_porcen
                        
                       FROM ctax_type
                      WHERE type_code = cvenfacl_tax_code4
                    ;
       IF m_detra_porcen >= m_detra_porcen_max THEN
         LET m_detra_porcen_max = m_detra_porcen;
         LET m_detra_codart = cvenfacl_codart;
         LET m_detra_taxkey = carticul_taxkey;
       END IF;
     END IF;
    END FOREACH

    IF m_detra_taxkey IS NOT NULL THEN

      FOREACH
       SELECT 
                            cvenfacl.linidx,
                            cvenfacl.precio * cvenfacl.cantid * (100 - cvenfacl.dtolin) / 100 totnet
                         INTO 
                            cvenfacl_linidx, 
                            cvenfacl_totnet
                        
                       FROM cvenfacl, ctax_type
                      WHERE cvenfacl.facidx = p_facidx
                        AND cvenfacl.tax_code1 = ctax_type.type_code
                        AND ctax_type.type_porcen != 0
                           EXECUTE PROCEDURE cinvoicel_get_taxdata('cvenfacl',cvenfach_empcode,cvenfach_fecfac,cvenfach_fecope,cvenfach_zimdel,cvenfach_zimter,cvenfach_tercer,cvenfach_dtocab,cvenfach_grpfis,cvenfach_dockey,cvenfach_ciftyp,ctercero_taxkey,ctertipo_aplret,m_detra_codart,m_detra_taxkey,cvenfacl_totnet,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL) INTO cvenfacl_tax_porded,cvenfacl_tax_porpro,cvenfacl_tax_ctapro,cvenfacl_tax_basimp1,cvenfacl_tax_oper1,cvenfacl_tax_code1,cvenfacl_tax_rule1,cvenfacl_tax_basimp2,cvenfacl_tax_oper2,cvenfacl_tax_code2,cvenfacl_tax_rule2,cvenfacl_tax_basimp3,cvenfacl_tax_oper3,cvenfacl_tax_code3,cvenfacl_tax_rule3,cvenfacl_tax_basimp4,cvenfacl_tax_oper4,cvenfacl_tax_code4,cvenfacl_tax_rule4;
       UPDATE cvenfacl
          SET totnet=cvenfacl_totnet,
              tax_porded=cvenfacl_tax_porded,
              tax_basimp1=cvenfacl_tax_basimp1,
              tax_oper1=cvenfacl_tax_oper1,
              tax_code1=cvenfacl_tax_code1,
              tax_rule1=cvenfacl_tax_rule1,
              tax_basimp2=cvenfacl_tax_basimp2,
              tax_oper2=cvenfacl_tax_oper2,
              tax_code2=cvenfacl_tax_code2,
              tax_rule2=cvenfacl_tax_rule2,
              tax_basimp3=cvenfacl_tax_basimp3,
              tax_oper3=cvenfacl_tax_oper3,
              tax_code3=cvenfacl_tax_code3,
              tax_rule3=cvenfacl_tax_rule3,
              tax_basimp4=cvenfacl_tax_basimp4,
              tax_oper4=cvenfacl_tax_oper4,
              tax_code4=cvenfacl_tax_code4,
              tax_rule4=cvenfacl_tax_rule4
        WHERE 
                            linidx = cvenfacl_linidx
                        ;
      END FOREACH

    END IF;
    IF m_tmp_origen = 'pe_einvoice_extend' THEN
      LET cvenfach_net_amount = 
                    cvenfach_impnet * (1 - cvenfach_dtocab / 100)
                ;
    ELSE
          LET cvenfach_net_amount = 
                    ROUND(cvenfach_impnet * (1 - cvenfach_dtocab / 100), cmonedas_tipred)
                ;

    END IF;
    IF m_tax_manual != 0 THEN
      SELECT NVL(SUM(cvenfach_tax.tax_cuoded + cvenfach_tax.tax_cuonded), 0),
                        NVL(SUM(CASE WHEN ctax_class.class_type IN ('N', 'E') THEN cvenfach_tax.tax_cuoded + cvenfach_tax.tax_cuonded
                                      ELSE 0
                                  END), 0),
                        NVL(SUM(CASE WHEN ctax_class.class_type = 'R' THEN cvenfach_tax.tax_cuoded + cvenfach_tax.tax_cuonded
                                      ELSE 0
                                  END), 0),
                        NVL(SUM(CASE WHEN ctax_class.class_type = 'D' THEN cvenfach_tax.tax_cuoded + cvenfach_tax.tax_cuonded
                                      ELSE 0
                                  END), 0) INTO 
                        m_tot_cuota, o_totiva, o_totret, o_totdet
                    
                     FROM cvenfach_tax
                          INNER JOIN (ctax_type
                                      INNER JOIN ctax_class
                                              ON ctax_type.type_class = ctax_class.class_code)
                                  ON cvenfach_tax.tax_code = ctax_type.type_code
                    WHERE cvenfach_tax.facidx = cvenfach_facidx
                ;
    ELSE
          EXECUTE PROCEDURE cvenfach_get_taxes(cvenfach_facidx,cvenfach_dtocab,cvenfach_net_amount,cmonedas_tipred) INTO m_tot_cuota,o_totiva,o_totret,o_totdet;
            -- RAISE EXCEPTION -746, 0, 'm_tot_cuota ' || m_tot_cuota;

    END IF;
    LET cvenfach_imptot = ROUND(cvenfach_net_amount + m_tot_cuota, cmonedas_tipred);
    UPDATE cvenfach
       SET impnet=NVL(cvenfach_impnet, 0),
           imptot=NVL(cvenfach_imptot, 0),
           user_updated=USER,
           date_updated=CURRENT
     WHERE 
                facidx = cvenfach_facidx
            ;
    IF m_exist_refcat != 0 THEN
      DELETE FROM ctax_invoice_refcat WHERE 
						facidx    = cvenfach_facidx AND
						ref_table = 'cvenfach'
					;

      FOREACH
       SELECT 
                            DISTINCT ctax_class.class_order
                         INTO 
                            m_class_order
                        
                        FROM cvenfach_tax, ctax_type, ctax_class
                       WHERE cvenfach_tax.tax_code = ctax_type.type_code
                         AND ctax_type.type_class  = ctax_class.class_code
                         AND ctax_class.class_type IN ('N','R')
                         AND cvenfach_tax.facidx   = cvenfach_facidx
                           IF m_class_order = 1 THEN
         INSERT INTO ctax_invoice_refcat (ref_table, facidx, ref_code, ref_oper, ref_type, ref_basimp, ref_cuota) 
                   SELECT 
                                        'cvenfach',
                                        cvenfacl.facidx,
                                        cvenfacl.tax_refere,
                                        cvenfacl.tax_oper1,
                                        cvenfacl.tax_code1,
                                        SUM(cvenfacl.tax_basimp1),
                                        SUM(cvenfacl.tax_basimp1 * ctax_type.type_porcen/100)
                                    
                                    FROM cvenfacl, ctax_type
                                   WHERE cvenfacl.facidx    = cvenfach_facidx
                                     AND cvenfacl.tax_code1 = ctax_type.type_code
                                     AND cvenfacl.tax_refere IS NOT NULL
                                GROUP BY 1,2,3,4,5
                                ;
        ELIF m_class_order = 2 THEN
          INSERT INTO ctax_invoice_refcat (ref_table, facidx, ref_code, ref_oper, ref_type, ref_basimp, ref_cuota) 
                     SELECT 
                                            'cvenfach',
                                            cvenfacl.facidx,
                                            cvenfacl.tax_refere,
                                            cvenfacl.tax_oper2,
                                            cvenfacl.tax_code2,
                                            SUM(cvenfacl.tax_basimp2),
                                            SUM(cvenfacl.tax_basimp2 * ctax_type.type_porcen/100)
                                        
                                        FROM cvenfacl, ctax_type
                                       WHERE cvenfacl.facidx    = cvenfach_facidx
                                         AND cvenfacl.tax_code2 = ctax_type.type_code
                                         AND cvenfacl.tax_refere IS NOT NULL
                                    GROUP BY 1,2,3,4,5
                                    ;
        ELIF m_class_order = 3 THEN
          INSERT INTO ctax_invoice_refcat (ref_table, facidx, ref_code, ref_oper, ref_type, ref_basimp, ref_cuota) 
                     SELECT 
                                            'cvenfach',
                                            cvenfacl.facidx,
                                            cvenfacl.tax_refere,
                                            cvenfacl.tax_oper3,
                                            cvenfacl.tax_code3,
                                            SUM(cvenfacl.tax_basimp3),
                                            SUM(cvenfacl.tax_basimp3 * ctax_type.type_porcen/100)
                                        
                                        FROM cvenfacl, ctax_type
                                       WHERE cvenfacl.facidx    = cvenfach_facidx
                                         AND cvenfacl.tax_code3 = ctax_type.type_code
                                         AND cvenfacl.tax_refere IS NOT NULL
                                    GROUP BY 1,2,3,4,5
                                    ;
        ELIF m_class_order = 4 THEN
          INSERT INTO ctax_invoice_refcat (ref_table, facidx, ref_code, ref_oper, ref_type, ref_basimp, ref_cuota) 
                     SELECT 
                                            'cvenfach',
                                            cvenfacl.facidx,
                                            cvenfacl.tax_refere,
                                            cvenfacl.tax_oper4,
                                            cvenfacl.tax_code4,
                                            SUM(cvenfacl.tax_basimp4),
                                            SUM(cvenfacl.tax_basimp4 * ctax_type.type_porcen/100)
                                        
                                        FROM cvenfacl, ctax_type
                                       WHERE cvenfacl.facidx    = cvenfach_facidx
                                         AND cvenfacl.tax_code4 = ctax_type.type_code
                                         AND cvenfacl.tax_refere IS NOT NULL
                                    GROUP BY 1,2,3,4,5
                                    ;
       END IF;
      END FOREACH

    END IF;

    RETURN
        o_totiva
        ,o_totret
        ,o_totdet
    ;
END PROCEDURE;