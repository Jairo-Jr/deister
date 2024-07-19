 DROP PROCEDURE cvenfach_get_taxes;

-- **************************************************************************
-- cvenfach_get_taxes
-- DEISTER WebStudio XSQL-UDFUNC  -  Engine: informix
-- **************************************************************************
CREATE PROCEDURE cvenfach_get_taxes(
    p_facidx integer,
    p_dtocab LIKE cvenfach.dtocab,
    p_impnet LIKE cvenfach.impnet,
    p_tipred LIKE cmonedas.tipred
)

    RETURNING
        decimal (14,7) AS o_totcuo
        ,decimal (14,6) AS o_totiva
        ,decimal (14,6) AS o_totret
        ,decimal (14,6) AS o_totdet
    ;
    -- =================================
    -- Definition of OUTPUT variables
    -- =================================
    DEFINE o_totcuo decimal(14,7);
    DEFINE o_totiva LIKE cvenfach_tax.tax_cuoded;
    DEFINE o_totret LIKE cvenfach_tax.tax_cuoded;
    DEFINE o_totdet LIKE cvenfach_tax.tax_cuoded;

    -- =================================
    -- Definition of variables
    -- =================================
    DEFINE m_class_type LIKE ctax_class.class_type;
    DEFINE m_tax_seqno LIKE cvenfach_tax.tax_seqno;
    DEFINE m_tax_order LIKE cvenfach_tax.tax_order;
    DEFINE m_tax_oper LIKE cvenfach_tax.tax_oper;
    DEFINE m_tax_code LIKE cvenfach_tax.tax_code;
    DEFINE m_tax_mainkey LIKE cvenfach_tax.tax_mainkey;
    DEFINE m_tax_porcen LIKE cvenfach_tax.tax_porcen;
    DEFINE m_tax_porded LIKE cvenfach_tax.tax_porded;
    DEFINE m_tax_basimp LIKE cvenfach_tax.tax_basimp;
    DEFINE m_tax_basnimp LIKE cvenfach_tax.tax_basnimp;
    DEFINE m_tax_cuoded LIKE cvenfach_tax.tax_cuoded;
    DEFINE m_tax_cuonded LIKE cvenfach_tax.tax_cuonded;
    DEFINE m_tax_valori LIKE cvenfach_tax.tax_valori;
    DEFINE m_tax_telsend LIKE cvenfach_tax.tax_telsend;
    DEFINE m_tax_rule LIKE cvenfach_tax.tax_rule;
    DEFINE m_tax_manual LIKE cvenfach_tax.tax_manual;
    DEFINE m_tax_totnet LIKE cvenfach_tax.tax_basimp;
    DEFINE m_tax_cuota decimal(14,7);
    DEFINE m_tax_basimp_no_porcen LIKE cvenfach_tax.tax_basimp;
    DEFINE m_tot_tax_basimp LIKE cvenfach_tax.tax_basimp;
    DEFINE m_tot_tax_basnimp LIKE cvenfach_tax.tax_basnimp;
    DEFINE m_ajuste_taxh_seqno LIKE cvenfach_tax.tax_seqno;
    DEFINE m_oper_class LIKE ctax_operation.oper_class;
    DEFINE m_tmp_totdet LIKE cvenfach_tax.tax_cuoded;
    DEFINE tmp_var_divemp LIKE cempresa.divemp;
    DEFINE tmp_var_moneda LIKE ccomfach.moneda;
    DEFINE tmp_var_cambio LIKE ccomfach.cambio;
    DEFINE m_tmp_cuota decimal;
    DEFINE m_tmp_origen LIKE cvenfach.auxnum5;

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

-- BEGIN INCLUDE FOR XUDP
-- dbms: ghq_crp_dev
-- code: cvenfach_get_taxes
-- name: before
-- outs:  o_totcuo, o_totiva, o_totret, o_totdet

-- NOT FOUND

-- END   INCLUDE FOR XUDP


    DELETE FROM cvenfach_tax WHERE 
                facidx = p_facidx
            ;
    LET o_totcuo = 0;
    LET o_totiva = 0;
    LET o_totret = 0;
    LET o_totdet = 0;
    LET m_tmp_totdet = 0;
    LET m_tot_tax_basimp = 0;
    LET m_tot_tax_basnimp = 0;
    LET m_ajuste_taxh_seqno = 0;
    LET m_tax_basimp_no_porcen = 0;

    FOREACH
      
      -- ===============================================================
      -- LANGUAGE COMPATIBILITY WARNING
      -- INSERT can not be used in SELECT with INTO clause.
      -- ===============================================================
      SELECT 
                        1   tax_order,
                        
                        CASE 
                            WHEN ctax_type.type_porded != 0
                            THEN cvenfacl.tax_porded
                            ELSE 100
                        END                        tax_porded,
                        
                        cvenfacl.tax_oper1         tax_oper,
                        cvenfacl.tax_code1         tax_code,
                        ctax_type.type_porcen,
                        ctax_class.class_type,
                        ctax_rule.rule_out_valori  tax_valori,
                        ctax_rule.rule_out_mainkey tax_mainkey,
                        ctax_rule.rule_out_telsend tax_telsend,
                        cvenfacl.tax_rule1         tax_rule,
                        
                        SUM(cvenfacl.totnet)       tax_totnet,
                        SUM(cvenfacl.tax_basimp1)  tax_basimp
                     INTO 
                        m_tax_order,      
                        m_tax_porded,
                        
                        m_tax_oper,
                        m_tax_code,
                        m_tax_porcen,
                        m_class_type,
                        m_tax_valori,
                        m_tax_mainkey,
                        m_tax_telsend,
                        m_tax_rule,
                        
                        m_tax_totnet,
                        m_tax_basimp
                    
                    FROM cvenfacl
                          INNER JOIN (carticul
                                       INNER JOIN ctax_artkey
                                               ON carticul.taxkey = ctax_artkey.artk_code)
                                  ON cvenfacl.codart = carticul.codart
                          INNER JOIN (ctax_type
                                       INNER JOIN ctax_class
                                               ON ctax_type.type_class = ctax_class.class_code)
                                  ON cvenfacl.tax_code1 = ctax_type.type_code
                          INNER JOIN ctax_rule
                                  ON cvenfacl.tax_rule1 = ctax_rule.rule_seqno
                        
                    WHERE cvenfacl.facidx = p_facidx AND
                          ctax_artkey.artk_nature != 'X' AND
                          cvenfacl.tax_code1 IS NOT NULL
                    GROUP BY 1,2,3,4,5,6,7,8,9,10
                      UNION ALL 
      SELECT 
                        2   tax_order,
                        
                        CASE 
                            WHEN ctax_type.type_porded != 0
                            THEN cvenfacl.tax_porded
                            ELSE 100
                        END                        tax_porded,
                        
                        cvenfacl.tax_oper2         tax_oper,
                        cvenfacl.tax_code2         tax_code,
                        ctax_type.type_porcen,
                        ctax_class.class_type,
                        ctax_rule.rule_out_valori  tax_valori,
                        ctax_rule.rule_out_mainkey tax_mainkey,
                        ctax_rule.rule_out_telsend tax_telsend,
                        cvenfacl.tax_rule2         tax_rule,
                        
                        SUM(cvenfacl.totnet)       tax_totnet,
                        SUM(cvenfacl.tax_basimp2)  tax_basimp
                    
                    FROM cvenfacl
                          INNER JOIN (carticul
                                       INNER JOIN ctax_artkey
                                               ON carticul.taxkey = ctax_artkey.artk_code)
                                  ON cvenfacl.codart = carticul.codart
                          INNER JOIN (ctax_type
                                       INNER JOIN ctax_class
                                               ON ctax_type.type_class = ctax_class.class_code)
                                  ON cvenfacl.tax_code2 = ctax_type.type_code
                          INNER JOIN ctax_rule
                                  ON cvenfacl.tax_rule2 = ctax_rule.rule_seqno
                    
                    WHERE cvenfacl.facidx = p_facidx AND
                          ctax_artkey.artk_nature != 'X' AND
                          cvenfacl.tax_code2 IS NOT NULL
                    GROUP BY 1,2,3,4,5,6,7,8,9,10
                      UNION ALL 
      SELECT 
                        3   tax_order,
                        
                        CASE 
                            WHEN ctax_type.type_porded != 0
                            THEN cvenfacl.tax_porded
                            ELSE 100
                        END                        tax_porded,
                        
                        cvenfacl.tax_oper3         tax_oper,
                        cvenfacl.tax_code3         tax_code,
                        ctax_type.type_porcen,
                        ctax_class.class_type,
                        ctax_rule.rule_out_valori  tax_valori,
                        ctax_rule.rule_out_mainkey tax_mainkey,
                        ctax_rule.rule_out_telsend tax_telsend,
                        cvenfacl.tax_rule3         tax_rule,
                        
                        SUM(cvenfacl.totnet)       tax_totnet,
                        SUM(cvenfacl.tax_basimp3)  tax_basimp
                    
                    FROM cvenfacl
                          INNER JOIN (carticul
                                       INNER JOIN ctax_artkey
                                               ON carticul.taxkey = ctax_artkey.artk_code)
                                  ON cvenfacl.codart = carticul.codart
                          INNER JOIN (ctax_type
                                       INNER JOIN ctax_class
                                               ON ctax_type.type_class = ctax_class.class_code)
                                  ON cvenfacl.tax_code3 = ctax_type.type_code
                          INNER JOIN ctax_rule
                                  ON cvenfacl.tax_rule3 = ctax_rule.rule_seqno
                        
                    WHERE cvenfacl.facidx = p_facidx AND
                          ctax_artkey.artk_nature != 'X' AND
                          cvenfacl.tax_code3 IS NOT NULL
                    GROUP BY 1,2,3,4,5,6,7,8,9,10
                      UNION ALL 
      SELECT 
                        4   tax_order,
                        
                        CASE 
                            WHEN ctax_type.type_porded != 0
                            THEN cvenfacl.tax_porded
                            ELSE 100
                        END                        tax_porded,
                        
                        cvenfacl.tax_oper4         tax_oper,
                        cvenfacl.tax_code4         tax_code,
                        ctax_type.type_porcen,
                        ctax_class.class_type,
                        ctax_rule.rule_out_valori  tax_valori,
                        ctax_rule.rule_out_mainkey tax_mainkey,
                        ctax_rule.rule_out_telsend tax_telsend,
                        cvenfacl.tax_rule4         tax_rule,
                        
                        SUM(cvenfacl.totnet)       tax_totnet,
                        SUM(cvenfacl.tax_basimp4)  tax_basimp
                    
                    FROM cvenfacl
                          INNER JOIN (carticul
                                       INNER JOIN ctax_artkey
                                               ON carticul.taxkey = ctax_artkey.artk_code)
                                  ON cvenfacl.codart = carticul.codart
                          INNER JOIN (ctax_type
                                       INNER JOIN ctax_class
                                               ON ctax_type.type_class = ctax_class.class_code)
                                  ON cvenfacl.tax_code4 = ctax_type.type_code
                          INNER JOIN ctax_rule
                                  ON cvenfacl.tax_rule4 = ctax_rule.rule_seqno
                        
                    WHERE cvenfacl.facidx = p_facidx AND
                          ctax_artkey.artk_nature != 'X' AND
                          cvenfacl.tax_code4 IS NOT NULL
                    GROUP BY 1,2,3,4,5,6,7,8,9,10
                
     SELECT 
                   divemp, moneda, cambio, auxnum5
                INTO 
                   tmp_var_divemp, tmp_var_moneda, tmp_var_cambio, m_tmp_origen
               
               FROM cvenfach, cempresa
              WHERE cvenfach.empcode = cempresa.empcode
                AND facidx = p_facidx
           ;
     IF m_tax_porcen = 0 THEN
       LET m_tax_basimp_no_porcen = m_tax_basimp_no_porcen + m_tax_basimp;
     END IF;
     IF m_tmp_origen = 'pe_einvoice_extend' THEN
       IF m_class_type = 'D' THEN
         LET m_tax_basimp = ROUND(m_tax_basimp, p_tipred);
       ELSE
                LET m_tax_basimp = m_tax_basimp;

       END IF;
       LET m_tax_totnet = m_tax_totnet * (1 - p_dtocab/100);
       LET m_tax_basnimp = m_tax_totnet - m_tax_basimp;
       LET m_tax_cuota = m_tax_basimp * m_tax_porcen / 100;
       LET m_tax_cuoded = m_tax_cuota * m_tax_porded / 100;
       LET m_tax_cuonded = m_tax_cuota - m_tax_cuoded;
       LET o_totcuo = o_totcuo + m_tax_cuota;
    --    RAISE EXCEPTION -746, 0, 'm_tax_cuota ' || m_tax_basimp || ' - ' || m_tax_porcen || ' - ' || m_tax_cuota || ' : ' || m_tax_basimp * m_tax_porcen / 100;
    --    RAISE EXCEPTION -746, 0, 'o_totcuo ' || o_totcuo || ' - ' || m_tax_cuota;
     ELSE
            IF m_class_type = 'D' AND m_tax_basimp_no_porcen != 0  THEN
         LET m_tax_basimp = ROUND(m_tax_basimp + m_tax_basimp_no_porcen, p_tipred);
       ELSE
                LET m_tax_basimp = ROUND(m_tax_basimp, p_tipred);

       END IF;
       LET m_tax_totnet = ROUND(m_tax_totnet * (1 - p_dtocab/100), p_tipred);
       LET m_tax_basnimp = ROUND(m_tax_totnet - m_tax_basimp, p_tipred);
       LET m_tax_cuota = ROUND(m_tax_basimp * m_tax_porcen / 100, p_tipred);
       LET m_tax_cuoded = ROUND(m_tax_cuota * m_tax_porded / 100, p_tipred);
       LET m_tax_cuonded = m_tax_cuota - m_tax_cuoded;
       LET o_totcuo = o_totcuo + m_tax_cuota;

     END IF;
     SELECT 
                    ctax_operation.oper_class
                 INTO 
                    m_oper_class
                
                FROM ctax_operation
                WHERE ctax_operation.oper_code  = m_tax_oper
            ;
     IF m_oper_class = 'DET' THEN
       LET m_tax_basnimp = 0;
     END IF;
     IF m_class_type IN ('N', 'E') THEN
       LET o_totiva = o_totiva + m_tax_cuota;
     END IF;
     IF m_class_type = 'R' THEN
       LET o_totret = o_totret + m_tax_cuota;
     END IF;
     IF m_class_type = 'D' THEN
       LET m_tmp_totdet = o_totdet + m_tax_cuota;
       IF tmp_var_divemp != tmp_var_moneda THEN
         LET o_totdet = ROUND(m_tmp_totdet * tmp_var_cambio, 0) / tmp_var_cambio;
         LET m_tax_cuoded = ROUND(m_tax_cuoded * tmp_var_cambio, 0) / tmp_var_cambio;
       ELSE
                LET o_totdet = o_totdet + m_tax_cuota;
         LET m_tax_cuoded = ROUND(m_tax_cuoded, 0);

       END IF;
     END IF;
     INSERT INTO cvenfach_tax (tax_seqno, facidx, tax_order, tax_oper, tax_code, tax_mainkey, tax_porcen, tax_porded, tax_basimp, tax_basnimp, tax_cuoded, tax_cuonded, tax_valori, tax_telsend, tax_rule)
       VALUES (0, p_facidx, m_tax_order, m_tax_oper, m_tax_code, m_tax_mainkey, m_tax_porcen, m_tax_porded, m_tax_basimp, m_tax_basnimp, m_tax_cuoded, m_tax_cuonded, m_tax_valori, m_tax_telsend, m_tax_rule);
     LET m_tax_seqno = DBINFO('sqlca.sqlerrd1');
     IF m_class_type = 'N' THEN
       LET m_tot_tax_basimp = m_tot_tax_basimp  + m_tax_basimp;
       LET m_tot_tax_basnimp = m_tot_tax_basnimp + m_tax_basnimp;
       IF 
                            m_tax_basnimp != 0
                         THEN
         LET m_ajuste_taxh_seqno = m_tax_seqno;
       END IF;
       IF 
                            m_ajuste_taxh_seqno = 0
                         THEN
         LET m_ajuste_taxh_seqno = m_tax_seqno;
       END IF;
     END IF;
    END FOREACH

    LET o_totcuo = o_totcuo - m_tmp_totdet;
    IF p_impnet != (m_tot_tax_basimp + m_tot_tax_basnimp) THEN
      UPDATE cvenfach_tax
         SET tax_basimp=tax_basimp + (p_impnet - (m_tot_tax_basimp + m_tot_tax_basnimp))
       WHERE 
                        tax_seqno = m_ajuste_taxh_seqno
                    ;
    END IF;

    RETURN
        o_totcuo
        ,o_totiva
        ,o_totret
        ,o_totdet
    ;
END PROCEDURE;