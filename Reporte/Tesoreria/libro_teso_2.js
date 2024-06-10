

var mCondInput = '1=1';
var mFECINI = `'01-03-2024'`;
var mFECFIN = `'10-03-2024'`;

var mCondInput_2 = mCondInput.toString().replace('capuntes.diario', 'cefeplah.diario')
    .replace('capuntes.moneda', 'taptfluj.monflu')
    .replace('capuntes.cuenta', 'taptfluj.ctaflu');

let mTmpTaptcuen = Ax.db.getTempTableName(`tmp_taptcuen`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTaptcuen}`);

Ax.db.execute(`
        <union intotemp='${mTmpTaptcuen}' type='all'>
        
            
            
            <!-- ORIGEN EXTRACTO -->
            <select>
                <columns>
                    capuntes.empcode, capuntes.ejerci,
                    capuntes.period,  capuntes.loteid, 
                    CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
                            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
                            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
                            ELSE  'X'||capuntes.jusser
                        END jusser,
                    SUBSTR(cbancpro.codban,5,2) codban, capuntes.fecha,  capuntes.asient,
                    NVL(capuntes.fecval,taptcuen.fecope) fecven, 
                    MONTH(NVL(capuntes.fecval,taptcuen.fecope)) mesval, 
                    capuntes.cuenta,  ccuentas.nombre nomcta,  capuntes.moneda, taptcuen.fecope, 
                    '' taxmed,  '' nomefe,  '' auxnum3, 
                    
                    SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))) serie,
                    
                    capuntes.docser docser, taptcuen.refban, taptcuen.ctafin, taptcuen.remesa,
                    
                    taptcuen.apteid,
                    ''::integer ciftyp, 
                    '' cif,
                    '' nombre,
                    toperfin.nomope,  capuntes.concep, taptfluj.impdiv, taptfluj.impflu, '1' estado,
                    cremesas.fecrem,  
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    capuntes.diario, taptcuen.concid
                </columns>
                <from table='cbancpro'>
                    <join table='cempresa'>
                        <on>cbancpro.empcode = cempresa.empcode</on>
                        <join table='ccuentas'>
                            <on>cempresa.placon  = ccuentas.placon</on>
                            <on>cbancpro.cuenta  = ccuentas.codigo</on>
                        </join>     
                    </join>
    
                    <join table='taptcuen'>
                        <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                        <join table='toperfin'>
                            <on>taptcuen.opefin  = toperfin.opefin</on>
                        </join>                     
                        <join table='taptfluj'>
                            <on>taptcuen.apteid  = taptfluj.rowenl</on>
                        </join>
                        <join table='capuntes'>
                            <on>taptcuen.loteid  = capuntes.loteid</on>
                        </join>
                        <join type='left' table='cremesas'>
                            <on>taptcuen.remesa  = cremesas.numrem</on>
                        </join>
                        
                    </join>
                </from>
                <where>
                    (CASE WHEN capuntes.cuenta LIKE '40189%'
                            OR capuntes.cuenta LIKE '67611%'
                            OR capuntes.cuenta LIKE '77611%' THEN 0 ELSE 1 END) = 1
                    AND (CASE WHEN taptfluj.ctaflu LIKE '40189%'
                                OR taptfluj.ctaflu LIKE '67611%'
                                OR taptfluj.ctaflu LIKE '77611%' THEN 0 ELSE 1 END) = 1
                    
                    AND taptfluj.numero IS NULL
                    AND (capuntes.cuenta LIKE '104%' OR capuntes.cuenta LIKE '106%')
                    <!-- AND capuntes.haber != 0 -->
                    AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                    AND ${mCondInput}
                </where>
            </select>
    
            <select>
                <columns>
                    capuntes.empcode, capuntes.ejerci,
                    capuntes.period,  capuntes.loteid, 
                    CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
                        WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
                        WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
                        ELSE  'X'||capuntes.jusser
                    END jusser,
        
                    MAX(SUBSTR(cbancpro.codban,5,2)) codban, MAX(capuntes.fecha) fecha,  MAX(capuntes.asient) asient,
                    MAX(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) fecven, 
                    MAX(MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))))) mesval, 
                    MAX(capuntes.cuenta) cuenta,  MAX(ccuentas.nombre) nomcta,  MAX(capuntes.moneda) moneda, MAX(taptcuen.fecope) fecope,
                    MAX(ctipoefe.taxmed) taxmed,  MAX(ctipoefe.nomefe) nomefe,  MAX(cefectos.auxnum3) auxnum3, 
                    
                    MAX(NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
                    SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))))) serie,
                    
                    MAX(NVL(cefectos.docser, capuntes.docser)) docser, MAX(cefectos.refban) refban, MAX(taptcuen.ctafin) ctafin, taptcuen.remesa,
                    
                    MAX(taptcuen.apteid) apteid,
                    MAX(ctercero.ciftyp) ciftyp, 
                    MAX(ctercero.cif) cif,
                    MAX(ctercero.nombre) nombre,
                    MAX(toperfin.nomope) nomope,  MAX(cefectos.coment) concep, 
                    SUM(taptfluj.impdiv) impdiv,
                    SUM(taptfluj.impflu) impflu,
                    '1' estado,
                    MAX(cremesas.fecrem) fecrem,  
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    MAX(capuntes.diario) diario, MAX(taptcuen.concid) concid
                </columns>
                <from table='cbancpro'>
                    <join table='cempresa'>
                        <on>cbancpro.empcode = cempresa.empcode</on>
                        <join table='ccuentas'>
                            <on>cempresa.placon  = ccuentas.placon</on>
                            <on>cbancpro.cuenta  = ccuentas.codigo</on>
                        </join>     
                    </join>
            
                    <join table='taptcuen'>
                        <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                        <join table='toperfin'>
                            <on>taptcuen.opefin  = toperfin.opefin</on>
                        </join>                     
                        <join table='taptfluj'>
                            <on>taptcuen.apteid  = taptfluj.rowenl</on>
                            <join type='left' table='cefectos'>
                                <on>taptfluj.numero  = cefectos.numero</on>
                                <join table='ctipoefe'>
                                    <on>cefectos.clase  = ctipoefe.clase</on>
                                    <on>cefectos.tipefe  = ctipoefe.codigo</on>
                                </join>
                                <join table='ctercero'>
                                    <on>cefectos.codper  = ctercero.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join table='capuntes'>
                            <on>taptcuen.loteid  = capuntes.loteid</on>
                            <!-- <on>cefectos.docser  = capuntes.docser</on> -->
                        </join>
                        <join type='left' table='cremesas'>
                            <on>taptcuen.remesa  = cremesas.numrem</on>
                        </join>
                        
                    </join>
                </from>
                <where>
                    (capuntes.cuenta LIKE '104%' OR capuntes.cuenta LIKE '106%')
                    AND taptfluj.numero IS NOT NULL
                    <!-- AND (CASE WHEN NVL(cefectos.auxnum3, '') = '07' AND cefectos.seccio LIKE '9999%' THEN 1
                              WHEN NVL(cefectos.auxnum3, '') = '07' THEN 0 ELSE 1 END) = 1 -->
                    
                    
                    AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                    AND ${mCondInput}
        
                </where>
                <group>
                    1,2,3,4,5,taptcuen.remesa,cefectos.codper
                </group>
            </select>
            
            <!-- Regitro Manual -->
            <select>
                <columns>
                    capuntes.empcode, capuntes.ejerci,
                    capuntes.period,  capuntes.loteid, 
                    CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
                            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
                            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
                            ELSE  'X'||capuntes.jusser
                        END jusser,
                    (SUBSTR(cbancpro.codban,5,2)) codban, (capuntes.fecha) fecha,  (capuntes.asient) asient,
                    (NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) fecven, 
                    (MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))))) mesval, 
                    (capuntes.cuenta) cuenta,  (ccuentas.nombre) nomcta,  (capuntes.moneda) moneda, (taptcuen.fecope) fecope, 
                    (ctipoefe.taxmed) taxmed,  (ctipoefe.nomefe) nomefe,  (cefectos.auxnum3) auxnum3, 
                    
                    (NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
                    SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))))) serie,
                    
                    (NVL(cefectos.docser, capuntes.docser)) docser, (cefectos.refban) refban, (taptcuen.ctafin) ctafin, taptcuen.remesa,
                    
                    (taptcuen.apteid) apteid,
                    (ctercero.ciftyp) ciftyp, 
                    (ctercero.cif) cif,
                    (ctercero.nombre) nombre,
                    (toperfin.nomope) nomope,  (cefectos.coment) concep, 
                    (taptfluj.impdiv) impdiv,
                    (taptfluj.impflu) impflu,
                    '1' estado,
                    (cremesas.fecrem) fecrem,  
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    (capuntes.diario) diario, (taptcuen.concid) concid
                </columns>
                <from table='cbancpro'>
                    <join table='cempresa'>
                        <on>cbancpro.empcode = cempresa.empcode</on>
                        <join table='ccuentas'>
                            <on>cempresa.placon  = ccuentas.placon</on>
                            <on>cbancpro.cuenta  = ccuentas.codigo</on>
                        </join>     
                    </join>
            
                    <join table='taptcuen'>
                        <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                        <join table='toperfin'>
                            <on>taptcuen.opefin  = toperfin.opefin</on>
                        </join>                     
                        <join table='taptfluj'>
                            <on>taptcuen.apteid  = taptfluj.rowenl</on>
                            <join type='left' table='cefectos'>
                                <on>taptfluj.numero  = cefectos.numero</on>
                                <join  table='ctipoefe'>
                                    <on>cefectos.clase  = ctipoefe.clase</on>
                                    <on>cefectos.tipefe  = ctipoefe.codigo</on>
                                </join>
                                <join  table='ctercero'>
                                    <on>cefectos.codper  = ctercero.codigo</on>
                                </join>
                                
                            </join>
                            <join table='capuntes'>
                                <on>taptcuen.rowenl  = capuntes.apteid</on>
                            </join>
                        </join>
                        <join type='left' table='cremesas'>
                            <on>taptcuen.remesa  = cremesas.numrem</on>
                        </join>
                        
                    </join>
                </from>
                <where>
                    (CASE WHEN capuntes.cuenta LIKE '103%' AND capuntes.debe != 0 THEN 0
                        WHEN capuntes.cuenta LIKE '103%' AND capuntes.haber != 0 AND NVL(taptcuen.concid, 0) != 0 THEN 0
                        WHEN capuntes.cuenta LIKE '42%' AND NVL(taptcuen.concid, 0) != 0 THEN 0
                        WHEN capuntes.cuenta LIKE '40189%'
                                OR capuntes.cuenta LIKE '67611%'
                                OR capuntes.cuenta LIKE '77611%' THEN 0 ELSE 1 END) = 1
                    AND NVL(cefectos.auxnum3, '') != '07'
                    
                    AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                    AND ${mCondInput}
            
                </where>
                
            </select>
            
            <!-- Capuntes de origen interfase -->
            <select>
                <columns>
                    capuntes.empcode, capuntes.ejerci,
                    capuntes.period,  capuntes.loteid, 
                    CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
                            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
                            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
                            ELSE  'X'||capuntes.jusser
                        END jusser,
                    SUBSTR(cbancpro.codban,5,2) codban, capuntes.fecha fecha,  capuntes.asient asient,
                    capuntes.fecval fecven, 
                    MONTH(capuntes.fecval) mesval, 
                    capuntes.cuenta cuenta,  ccuentas.nombre nomcta,  capuntes.moneda moneda, ''::DATE fecope, 
                    '' taxmed,  '' nomefe,  '' auxnum3, 
                    
                    SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))) serie,
                    
                    capuntes.docser docser, '' refban, cbancpro.ctafin ctafin, ''::INTEGER remesa,
                    
                    ''::INTEGER apteid,
                    ''::INTEGER ciftyp, 
                    '' cif,
                    '' nombre,
                    '' nomope,  capuntes.concep,
                    CASE WHEN capuntes.divdeb &gt; 0 THEN -capuntes.divdeb
                        WHEN capuntes.divhab &gt; 0 THEN +capuntes.divhab
                        ELSE 0
                    END impdiv,
                    CASE WHEN capuntes.debe &gt; 0 THEN -capuntes.debe
                        WHEN capuntes.haber &gt; 0 THEN +capuntes.haber
                        ELSE 0
                    END impflu,
                    '1' estado,
                    ''::DATE fecrem,  
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    capuntes.diario diario, ''::INTEGER concid
                </columns>
                <from table='capuntes'>
                    <join  table='ccuentas'>
                        <on>capuntes.cuenta  = ccuentas.codigo</on>
                        <on>capuntes.placon  = ccuentas.placon</on>
                        <join table="cbancpro">
                            <on>ccuentas.codigo = cbancpro.cuenta</on>
                        </join>
                    </join>
                </from>
                <where>
                    capuntes.diario IN ('27', '05')
                    AND (capuntes.cuenta LIKE '104%' OR capuntes.cuenta LIKE '106%')
                    AND capuntes.origen = 'MC'
                    AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                    AND ${mCondInput}

                </where>
            </select>
            
            <!-- Mov. Tesoreria sin Apuntes -->
            <select>
                <columns>
                    taptcuen.empcode, YEAR(taptcuen.fecope) ejerci,
                    MONTH(taptcuen.fecope) period,  ''::INTEGER loteid,
                    '' jusser,
                    MAX(SUBSTR(cbancpro.codban,5,2)) codban, MAX(taptcuen.fecope) fecha,  ''::INTEGER asient,
                    MAX(NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope)))) fecven,
                    MAX(MONTH(NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope))))) mesval,
                    MAX(taptfluj.ctaflu) cuenta,  MAX(ccuentas.nombre) nomcta,  MAX(taptfluj.monflu) moneda, MAX(taptcuen.fecope) fecope,
                    MAX(ctipoefe.taxmed) taxmed,  MAX(ctipoefe.nomefe) nomefe,  MAX(cefectos.auxnum3) auxnum3,
            
                    MAX(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1)))) serie,
            
                    MAX(cefectos.docser) docser, MAX(cefectos.refban) refban, MAX(taptcuen.ctafin) ctafin, taptcuen.remesa,
            
                    MAX(taptcuen.apteid) apteid,
                    MAX(ctercero.ciftyp) ciftyp,
                    MAX(ctercero.cif) cif,
                    MAX(ctercero.nombre) nombre,
                    MAX(toperfin.nomope) nomope,  MAX(cefectos.coment) concep,
                    SUM(taptfluj.impdiv) impdiv,
                    SUM(taptfluj.impflu) impflu,
                    '1' estado,
                    MAX(cremesas.fecrem) fecrem,  
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    MAX(cefeplah.diario) diario, MAX(taptcuen.concid) concid
                </columns>
                <from table='cefecges_pcs'>
                    <join table='taptcuen'>
                        <on>cefecges_pcs.pcs_seqno = taptcuen.gesori</on>
                        <join table='taptfluj'>
                            <on>taptcuen.apteid  = taptfluj.rowenl</on>
                            <join table='cefectos'>
                                <on>taptfluj.numero  = cefectos.numero</on>
                                <join table='ctipoefe'>
                                    <on>cefectos.clase  = ctipoefe.clase</on>
                                    <on>cefectos.tipefe  = ctipoefe.codigo</on>
                                </join>
                                <join table='ctercero'>
                                    <on>cefectos.codper  = ctercero.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join table='cbancpro'>
                            <on>taptcuen.ctafin  = cbancpro.ctafin</on>
                            <join table='cempresa'>
                                <on>cbancpro.empcode = cempresa.empcode</on>
                                <join table='ccuentas'>
                                    <on>cempresa.placon  = ccuentas.placon</on>
                                    <on>cbancpro.cuenta  = ccuentas.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join table='toperfin'>
                            <on>taptcuen.opefin  = toperfin.opefin</on>
                        </join>
                        <join type='left' table='cremesas'>
                            <on>taptcuen.remesa  = cremesas.numrem</on>
                        </join>
                    </join>
                    <join type='left' table='cefeacti'>
                        <on>cefecges_pcs.pcs_accion  = cefeacti.codigo</on>
                        <on>cefecges_pcs.pcs_clase  = cefeacti.clase</on>
                        <join table='cefeplah'>
                            <on>cefeacti.codigo  = cefeplah.codigo</on>
                            <on>cefeacti.clase  = cefeplah.clase</on>
                        </join>
                    </join>
                </from>
                <where>
                    (CASE WHEN taptfluj.ctaflu LIKE '40189%'
                          OR taptfluj.ctaflu LIKE '67611%'
                          OR taptfluj.ctaflu LIKE '77611%' THEN 0 ELSE 1 END) = 1
                    <!-- AND NVL(cefectos.auxnum3, '') != '07' -->
                    
                    
                    AND NVL(taptcuen.loteid, 0) = 0
                    AND taptcuen.fecope BETWEEN ${mFECINI} AND ${mFECFIN}
            
                    AND ${mCondInput_2}
            
                </where>
                <group>
                    1,2,3,4,5,taptcuen.remesa,cefectos.codper
                </group>
            </select>
            
        </union>
    `);

let mTmpCefecgesPcs = Ax.db.getTempTableName(`tmp_cefecges_pcs`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCefecgesPcs}`);

Ax.db.execute(`
        <select intotemp='${mTmpCefecgesPcs}'>
            <columns>
                pcs_seqno::VARCHAR(255) pcs_seqno,
                pcs_loteid
            </columns>
            <from table='cefecges_pcs' />
        </select>
    `);

var rsTesoreria = Ax.db.executeQuery(`
        <union type='all'>
            <!-- SALDO INICIAL/APERTURA -->
            <select>
                <columns>
                    capuntes.empcode, ''::INTEGER ejerci,
                    ''::INTEGER period,  ''::INTEGER loteid, 
                    ''::INTEGER loteid_2,  '' jusser,
                    '' codban, ''::DATE fecha,  ''::INTEGER asient,
                    ''::DATE fecven, 
                    ''::INTEGER mesval, 
                    capuntes.cuenta,  '' nomcta,  cbancpro.moneda, ''::DATE fecope, 
                    '' taxmed,  '' nomefe,  '' auxnum3, 
                    
                    '' serie,
                    
                    '' docser, '' refban, MAX(CASE WHEN cbancpro.estado = 'A' THEN cbancpro.ctafin END) ctafin,
                    ''::DATE fecrem,  ''::INTEGER remesa, '' remesa_desc,
                    
                    ''::INTEGER apteid,
                    ''::INTEGER ciftyp, 
                    '' cif,
                    '' nombre,
                    '' nomope,  'SALDO ANTERIOR......' concep, 
                    NVL(SUM(CASE WHEN (${mFECINI} > capuntes.fecha OR
                                      (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) AND cbancpro.moneda != 'PEN' THEN divdeb
                                 WHEN (${mFECINI} > capuntes.fecha OR
                                      (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) AND cbancpro.moneda = 'PEN' THEN debe ELSE 0 END),0) divdeb,
                    NVL(SUM(CASE WHEN (${mFECINI} > capuntes.fecha OR
                                      (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) AND cbancpro.moneda != 'PEN' THEN divhab
                                 WHEN (${mFECINI} > capuntes.fecha OR
                                      (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) AND cbancpro.moneda = 'PEN' THEN haber ELSE 0 END),0) divhab,
            
                    NVL(SUM(CASE WHEN (${mFECINI} > capuntes.fecha OR
                           (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) THEN debe  ELSE 0 END),0) debe,
                    NVL(SUM(CASE WHEN (${mFECINI} > capuntes.fecha OR
                           (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-'||YEAR(${mFECINI}))) THEN haber ELSE 0 END),0) haber,
                    '1' estado,
                    
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    '' diario, ''::INTEGER concid
                </columns>
                <from table="cbancpro">
                    <join type="left" table="capuntes">
                        <on>cbancpro.empcode = capuntes.empcode</on>
                        <on>cbancpro.cuenta  = capuntes.cuenta</on>
                    </join>
                    <join type="left" table="cempresa">
                        <on>cbancpro.empcode = cempresa.empcode</on>
                    </join>
                </from>
                <where>
                    ${mCondInput}
                    AND capuntes.asient &gt;= 0


                    AND capuntes.fecha BETWEEN (SELECT MIN(fecini)
                                                    FROM cperiodo
                                                    WHERE empcode = cbancpro.empcode
                                                    AND ejerci = YEAR(${mFECINI}))
                                            AND ${mFECFIN}
                </where>
                <group>1, 12, 14</group>
            </select>

            <select>
                <columns>
                    tmp_taptcuen.empcode, tmp_taptcuen.ejerci,
                    tmp_taptcuen.period,  cefecges_pcs.pcs_loteid loteid,
                    tmp_taptcuen.loteid loteid_2, tmp_taptcuen.jusser,
                    tmp_taptcuen.codban, tmp_taptcuen.fecha, 
                    CASE WHEN NVL(tmp_taptcuen.asient, '') != '' THEN tmp_taptcuen.asient
                        ELSE (SELECT MAX(asient) FROM capuntes WHERE loteid = cefecges_pcs.pcs_loteid)
                    END asient,
                    tmp_taptcuen.fecven,
                    tmp_taptcuen.mesval,
                    tmp_taptcuen.cuenta, tmp_taptcuen.nomcta, tmp_taptcuen.moneda, tmp_taptcuen.fecope,
                    tmp_taptcuen.taxmed, tmp_taptcuen.nomefe, tmp_taptcuen.auxnum3,
            
                    tmp_taptcuen.serie,
            
                    tmp_taptcuen.docser, tmp_taptcuen.refban, tmp_taptcuen.ctafin, tmp_taptcuen.fecrem, 
                    cremesas.numrem remesa,
                    
                    cremesas.numrem || 
                    ' (' || 
                    (SELECT SUM(CASE WHEN cefectos.clase = cremesas.clase THEN + cefecges_det.det_impdiv ELSE -cefecges_det.det_impdiv END) impdiv
                    FROM cefecges_pcs, cefecges_det, cefectos
                    WHERE cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno AND 
                            cefecges_det.det_numero = cefectos.numero AND 
                            cefecges_pcs.pcs_numrem  = cremesas.numrem AND
                            cefecges_pcs.pcs_accion = cremesas.accion) || 
                    ')' remesa_desc,
            
                    tmp_taptcuen.apteid,
                    tmp_taptcuen.ciftyp,
                    tmp_taptcuen.cif,
                    tmp_taptcuen.nombre,
                    tmp_taptcuen.nomope,  tmp_taptcuen.concep,

                    CASE WHEN tmp_taptcuen.impdiv &lt; 0 THEN ABS(tmp_taptcuen.impdiv)
                    ELSE 0 END divdeb,
                    CASE WHEN tmp_taptcuen.impdiv &gt; 0 THEN ABS(tmp_taptcuen.impdiv)
                    ELSE 0 END divhab,
            
                    CASE WHEN tmp_taptcuen.impflu &lt; 0 THEN ABS(tmp_taptcuen.impflu)
                    ELSE 0 END debe,
                    CASE WHEN tmp_taptcuen.impflu &gt; 0 THEN ABS(tmp_taptcuen.impflu)
                    ELSE 0 END haber,
                    '1' estado,
                    28 field_28,
                    29 field_29,
                    30 field_30,
                    31 field_31,
                    32 field_32,
                    tmp_taptcuen.diario, tmp_taptcuen.concid
                </columns>
                <from table='${mTmpTaptcuen}' alias='tmp_taptcuen' >
                    <join type='left' table='cefecges_pcs'>
                        <on>tmp_taptcuen.refban  = cefecges_pcs.pcs_seqno::CHAR(50)</on>
                    </join>
                    <join type='left' table='cremesas'>
                        <on>tmp_taptcuen.remesa  = cremesas.numrem</on>
                    </join>
                </from>
                <order>
                    1,14,12,24,9
                </order>
            </select>
        </union>
    `);

return rsTesoreria;








https://mail.google.com/mail/u/0/#inbox|http://localhost:8061/#|http://10.7.3.47:8080/|http://10.7.3.78:8080/|http://10.7.3.78:8081/