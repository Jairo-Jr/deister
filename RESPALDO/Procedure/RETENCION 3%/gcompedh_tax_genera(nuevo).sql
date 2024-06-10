-- COMPILADO EN BD
DROP PROCEDURE gcompedh_tax_genera;

CREATE PROCEDURE "informix".gcompedh_tax_genera(
    p_cabid LIKE gcompedl.cabid,
    p_tipred smallint
)
    DEFINE GLOBAL gl_debug   SMALLINT DEFAULT 0;    
    IF gl_debug > 1 THEN
        TRACE ON;
    END IF
    DELETE FROM gcompedh_tax WHERE 
                cabid = p_cabid
            ;
    INSERT INTO gcompedh_tax (tax_order,  cabid,    tax_oper,   tax_code,                      tax_porcen, tax_rule, tax_basimp, tax_quote) 
         SELECT 
                    1,
                    p_cabid,
                    gcompedl.tax_oper1,
                    gcompedl.tax_code1,
                    ctax_type.type_porcen,
                    gcompedl.tax_rule1,
                    ROUND(SUM(gcompedl.tax_basimp1), p_tipred),
                    ROUND(
                        ROUND(SUM(gcompedl.tax_basimp1), p_tipred) * ctax_type.type_porcen / 100,
                        p_tipred)
               FROM gcompedl, ctax_type
              WHERE gcompedl.cabid = p_cabid
                AND gcompedl.tax_code1 = ctax_type.type_code
           GROUP BY 1,2,3,4,5,6
            ;
    INSERT INTO gcompedh_tax (tax_order,  cabid,    tax_oper,   tax_code,                      tax_porcen, tax_rule, tax_basimp, tax_quote) 
         SELECT 
                    2,
                    p_cabid,
                    gcompedl.tax_oper2,
                    gcompedl.tax_code2,
                    ctax_type.type_porcen,
                    gcompedl.tax_rule2,
                    ROUND(SUM(gcompedl.tax_basimp2), p_tipred),
                    ROUND(
                        ROUND(SUM(gcompedl.tax_basimp2), p_tipred) * ctax_type.type_porcen / 100,
                        p_tipred)
               FROM gcompedl, ctax_type
              WHERE gcompedl.cabid = p_cabid
                AND gcompedl.tax_code2 = ctax_type.type_code
           GROUP BY 1,2,3,4,5,6
            ;
    INSERT INTO gcompedh_tax (tax_order,  cabid,    tax_oper,   tax_code,                      tax_porcen, tax_rule, tax_basimp, tax_quote) 
         SELECT 
                    3,
                    p_cabid,
                    gcompedl.tax_oper3,
                    gcompedl.tax_code3,
                    ctax_type.type_porcen,
                    gcompedl.tax_rule3,
                    ROUND(SUM(gcompedl.tax_basimp3), p_tipred),
                    ROUND(
                        ROUND(SUM(gcompedl.tax_basimp3), p_tipred) * ctax_type.type_porcen / 100,
                        p_tipred)
               FROM gcompedl, ctax_type
              WHERE gcompedl.cabid = p_cabid
                AND gcompedl.tax_code3 = ctax_type.type_code
           GROUP BY 1,2,3,4,5,6
            ;
    INSERT INTO gcompedh_tax (tax_order,  cabid,    tax_oper,   tax_code,                      tax_porcen, tax_rule, tax_basimp, tax_quote) 
         SELECT 
                    4,
                    p_cabid,
                    gcompedl.tax_oper4,
                    gcompedl.tax_code4,
                    ctax_type.type_porcen,
                    gcompedl.tax_rule4,
                    ROUND(SUM(gcompedl.tax_basimp4), p_tipred),
                    ROUND(
                        ROUND(SUM(gcompedl.tax_basimp4), p_tipred) * ctax_type.type_porcen / 100,
                        p_tipred)
               FROM gcompedl, ctax_type, gcompedh
              WHERE gcompedl.cabid = p_cabid
                AND gcompedl.tax_code4 = ctax_type.type_code
                AND gcompedl.cabid = gcompedh.cabid
                AND (CASE WHEN gcompedh.dockey IN ('01', '08') AND gcompedh.imptot > 700 AND tax_code4 = 'R03' THEN 1
                        WHEN tax_code4 != 'R03' THEN 1
                        ELSE 0
                    END) = 1
           GROUP BY 1,2,3,4,5,6
            ;
  UPDATE gcompedh_tax
     SET tax_quote=
                ROUND(tax_quote, 0)
   WHERE 
                    gcompedh_tax.cabid = p_cabid
                AND gcompedh_tax.tax_code IN (SELECT ctax_type.type_code 
                                                FROM ctax_type, ctax_class
                                               WHERE ctax_type.type_class  = ctax_class.class_code
                                                 AND ctax_class.class_type = 'D')
            ;
END PROCEDURE
;