/** REPORTE POR ELEMENTOS */

    // let mSqlCond = Ax.context.property.COND;
let mSqlCond = `cinmelem.codele IN ('125015945','125007030')`;

let mTmpTableCinmamorxMeses = Ax.db.getTempTableName(`tmp_cinmamor_x_meses`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxMeses}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxMeses}'>
            <columns>
                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele,
                cperiodo.ejerci,
                cperiodo.codigo,
                cperiodo.nomper,
    
                SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.import
                        ELSE 0
                    END)                                                    <alias name='amortizado' />,
                SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.impmax
                        ELSE 0
                    END)                                                    <alias name='depre_trib' />
            </columns>
            <from table='cinmelem'>
                <join type='left' table='cinmamor'>
                    <on>cinmelem.codinm = cinmamor.codinm</on>
                    <on>cinmelem.codele = cinmamor.codele</on>
                    <join table='cperiodo'>
                        <on>cinmamor.empcode = cperiodo.empcode</on>
                        <on>cinmamor.fecfin BETWEEN cperiodo.fecini AND cperiodo.fecfin</on>
                        <on>cperiodo.ejerci = YEAR(TODAY)</on>
                    </join>
                </join>
            </from>
            <group>
                1, 2, 3, 4, 5, 6
            </group>
            <order>
                6
            </order>
        </select>
    `);

let mTmpTableCinmamorxConta = Ax.db.getTempTableName(`tmp_cinmamor_x_conta`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxConta}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxConta}'>
            <columns>
                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele,
                SUM(cinmamor.import) <alias name='import' />,
                SUM(cinmamor.impmax) <alias name='import_depre' />
            </columns>
            <from table='cinmelem'>
                <join table='cinmamor'>
                    <on>cinmelem.codinm = cinmamor.codinm</on>
                    <on>cinmelem.codele = cinmamor.codele</on>
                    <on>cinmamor.fecfin BETWEEN MDY(1,1,YEAR(TODAY)) AND MDY(12,31,YEAR(TODAY))</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3
            </group>
            <order>
                4
            </order>
        </select>
    `);

let mTmpTableCinmamorxConta_Abril = Ax.db.getTempTableName(`tmp_cinmamor_x_conta_abril`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxConta_Abril}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxConta_Abril}'>
            <columns>
                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele,
                SUM(cinmamor.import) <alias name='import' />,
                SUM(cinmamor.impmax) <alias name='import_depre' />
            </columns>
            <from table='cinmelem'>
                <join table='cinmamor'>
                    <on>cinmelem.codinm = cinmamor.codinm</on>
                    <on>cinmelem.codele = cinmamor.codele</on>
                    <on>cinmamor.fecfin BETWEEN MDY(4,1,YEAR(TODAY)) AND MDY(12,31,YEAR(TODAY))</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3
            </group>
            <order>
                4
            </order>
        </select>
    `);
/* * */
let mTmpTable = Ax.db.getTempTableName(`tmp_opening_balance`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);
Ax.db.execute(`
        SELECT DISTINCT *
            FROM (SELECT gcomfach.docser, 
                    -- gcomsolh.depart depart_sol  2023 03 28 CBF por instruccion de MRA
                        NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol, gcomsoll.orden
                    FROM gcomfach,
                        gcomfacl,
                        gcommovh,
                        gcommovl,
                        gcompedh,
                        gcompedd,
                        gcompedl,
                        gcompedl_lnk,
                        gcomsolh,
                        gcomsoll
                    WHERE gcomfach.cabid = gcomfacl.cabid AND 
                        gcomfacl.cabori = gcommovh.cabid AND 
                        gcomfacl.tabori = 'gcommovh' AND 
                        gcommovh.cabid = gcommovl.cabid AND 
                        gcommovl.cabori = gcompedh.cabid AND 
                        gcommovl.tabori = 'gcompedh' AND 
                        gcompedh.tipdoc = gcompedd.codigo AND
                        gcompedh.cabid = gcompedl.cabid AND 
                        gcompedl.linid = gcompedl_lnk.linid AND 
                        gcompedl_lnk.lnk_cabori = gcomsolh.cabid AND 
                        gcompedl_lnk.lnk_tabori = 'gcomsolh' AND 
                        gcomsolh.cabid = gcomsoll.cabid AND 
                        gcompedd.circui = 'LOG'
                    AND    
                        gcomfach.cabid IN (SELECT g.cabid
                                            FROM gcomfach g
                                            WHERE g.docser IN (SELECT cinmcomp.docser
                                                                FROM cinmhead,
                                                                     cinmelem,
                                                                     cinmcomp
                                                                WHERE cinmhead.empcode = cinmelem.empcode AND 
                                                                      cinmhead.codinm = cinmelem.codinm AND 
                                                                      cinmelem.empcode = cinmcomp.empcode AND 
                                                                      cinmelem.codinm = cinmcomp.codinm AND 
                                                                      cinmelem.codele = cinmcomp.codele
                                                                      AND ${mSqlCond}))
            UNION ALL
            SELECT gcomfach.docser, 
                -- gcomsolh.depart depart_sol  2023 03 28 CBF por instruccion de MRA
                    NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol, gcomsoll.orden
            FROM gcomfacl,
                    gcomfach,
                    gcomalbl,
                    gcompedl,
                    gcompedh,
                    gcompedd,
                    gcomsoll_dist,
                    gcomsolh,
                    gcomsoll
            WHERE gcomfacl.cabid  = gcomfach.cabid AND 
                    gcomfacl.tabori = 'gcommovh' AND 
                    gcomfacl.cabori = gcomalbl.cabid AND 
                    gcomfacl.linori = gcomalbl.linid AND 
                    gcomalbl.tabori = 'gcompedh' AND 
                    gcomalbl.cabori = gcompedl.cabid AND 
                    gcomalbl.linori = gcompedl.linid AND 
                    gcompedl.cabid  = gcomsoll_dist.cabid AND 
                    gcompedl.codart = gcomsoll_dist.codart AND 
                    gcompedl.cabid  = gcompedh.cabid AND
                    gcompedh.tipdoc = gcompedd.codigo AND 
                    gcomsoll_dist.tabname = 'gcompedh' AND 
                    gcomsoll_dist.cabsol  = gcomsolh.cabid AND 
                    gcomsolh.cabid  = gcomsoll.cabid AND 
                    gcompedd.circui = 'LOG'
                AND    
                    gcomfach.cabid IN (SELECT g.cabid
                                        FROM gcomfach g
                                        WHERE g.docser IN (SELECT cinmcomp.numfac
                                                            FROM cinmhead,
                                                                 cinmelem,
                                                                 cinmcomp
                                                            WHERE cinmhead.empcode = cinmelem.empcode AND 
                                                                  cinmhead.codinm = cinmelem.codinm AND 
                                                                  cinmelem.empcode = cinmcomp.empcode AND 
                                                                  cinmelem.codinm = cinmcomp.codinm AND 
                                                                  cinmelem.codele = cinmcomp.codele
                                                                  AND ${mSqlCond})))
            
            INTO TEMP ${mTmpTable} WITH NO LOG
    `);

/**
 * AGRUPADO ELEMENTO - COMPONENTE
 */
let mTmpTableGroupElemento = Ax.db.getTempTableName(`@tmp_group_elemento`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGroupElemento}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableGroupElemento}'>
            <columns>
                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele,

                MAX(cinmcomp.fecha) fecha,
                MAX(cinmcomp.fecbaj) fecbaj,
                MAX(cinmcomp.auxchr4) auxchr4,
                MAX(cinmcomp.motivo) motivo,
                MAX(cinmcomp.docser) docser,
                MAX(cinmcomp.numfac) numfac,
                MAX(cinmcomp.fecfac) fecfac,
                MAX(cinmcomp.fecini) fecini,
                MAX(cinmcomp.tipcom) tipcom,
                MAX(cinmcomp.auxchr2) auxchr2,
                SUM(cinmcomp.auxchr3) auxchr3,
                SUM(cinmcomp.auxnum5) auxnum5,
                MAX(cinmcomp.codinm) codinm,
                MAX(cinmcomp.tercer) tercer,
                MAX(cinmcomp.seqno) seqno,

                MAX(cinmcomp.codcom) codcom,
                MAX(cinmcomp.nomcom) nomcom
            </columns>
            <from table='cinmelem'>
                <join table='cinmcomp'>
                    <on>cinmelem.empcode = cinmcomp.empcode</on>
                    <on>cinmelem.codinm = cinmcomp.codinm</on>
                    <on>cinmelem.codele = cinmcomp.codele</on>
                </join>
            </from>
            <group>
                1,2,3
            </group>
        </select>
    `);




let rsElementos = Ax.db.executeQuery(`
        <select>
            <columns>
                cinmelem.codele,
                cinmelem.nomele,
                cinmelem.auxchr1,
                'UND'                                                       <alias name='crp_medida' />,
                cinmelem.codinm                                             <alias name='crp_grupo_bien' />,
                cinmhead.nominm                                             <alias name='crp_descripcion_bien' />,
                cinmctas.ccamor,
                ccuentas2.nombre                                            <alias name='crp_description1' />, 
                crp_chv_mapcta2.ctaori                                      <alias name='crp_cuenta_depre_chv'/>,
                crp_chv_mapcta2.concep                                      <alias name='crp_descri_cuenta_chv'/>,
                cinmctas.ccdota,
                ccuentas3.nombre                                            <alias name='crp_description2' />,
                crp_chv_mapcta3.ctaori                                      <alias name='cdotach'/>,
                cinmelem_ppe.ppe_codloc,
                cinmlosu.nomlug,
                SUBSTR(cinmelem_ppe.ppe_codloc, 1, 6)                       <alias name='crp_ubi_padre' />,
                cinmlosu_padre.nomlug                                       <alias name='crp_ubi_padre_descri' />,
                cinmelem_ppe.ppe_codres                                     <alias name='crp_codigo_resp' />,
                cper_empleado.nomemp||' '|| cper_empleado.apeemp            <alias name='crp_descri_resp' />,
                ${mTmpTable}.depart_sol                                     <alias name='depart' />,
                gdeparta.nomdep,

                group_cinmcomp.codcom                                              <alias name='crp_componente' />,
                group_cinmcomp.nomcom                                              <alias name='crp_description_componente' />,
                
                YEAR(group_cinmcomp.fecha) || LPAD(MONTH(group_cinmcomp.fecha), 2, '0') <alias name='crp_periodo' />,
                group_cinmcomp.fecbaj,
                group_cinmcomp.auxchr4                                            <alias name='crp_causal' />,
                group_cinmcomp.motivo,
                group_cinmcomp.tercer                                             <alias name='crp_cod_proveedor' />,
                ctercero.nombre,
                ctercero.cif,
    
                gcomfach.tipdoc                                             <alias name='crp_tipologia' />,
                gcomfacd.nomdoc                                             <alias name='crp_descrip_tipologia' />,
                group_cinmcomp.docser,
                group_cinmcomp.numfac,
                group_cinmcomp.fecfac,
                group_cinmcomp.fecini                                             <alias name='crp_fecini_depre' />,
                cinmftab.numeje                                             <alias name='vufina' />,
                cinmeval.numeje                                             <alias name='vutri' />,
                cinmftab.porcen                                             <alias name='pdfina' />,
                cinmeval.porcen                                             <alias name='pdtrib' />,
                cinmelem_ppe.ppe_marca,
                gartmarc.nommar,
                cinmelem_ppe.ppe_modelo,
                gartmode.nommod,
                cinmelem_ppe.ppe_numser,
                cinmelem_ppe.ppe_label_id,
                gdeparta.seccio,
                cseccion.nomsec,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN cpar_parprel.ctainv
                        ELSE cinmctas.ccinmo
                END                                                         <alias name='crp_cuenta_inmo' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN (SELECT c.nombre
                                                                FROM ccuentas c
                                                                WHERE c.placon = 'PE'
                                                                    AND c.codigo = cpar_parprel.ctainv)
                        ELSE ccuentas1.nombre
                END                                                         <alias name='crp_cuenta_noinmo' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN (SELECT c.ctaori
                                                                FROM crp_chv_mapcta c
                                                                WHERE c.cuenta = cpar_parprel.ctainv)
                        ELSE crp_chv_mapcta1.ctaori
                END                                                                     <alias name='crp_cuenta_chv' />,
                cinmelem.codpre                                                         <alias name='crp_inversion' />,
                cpar_parpreh.nompre                                                     <alias name='crp_descri_inversion' />,
                cinmelem.codpar                                                         <alias name='crp_partida' />,
                cpar_parprel.nompar                                                     <alias name='crp_descri_partida' />,
    
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN group_cinmcomp.docser END          <alias name='Nro_Contrato_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN group_cinmcomp.fecfac END          <alias name='Fecha_Contrato_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmftab.numeje END          <alias name='Nro_Cuotas_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmeval.invele END          <alias name='Monto_Total_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '33%' AND cinmctas.ccinmo NOT LIKE '339%' THEN 'Activos fijos'
                        WHEN NVL(cpar_parprel.ctainv, cinmctas.ccinmo) LIKE '339%' THEN 'Obras en curso'
                        WHEN cinmctas.ccinmo LIKE '321%' THEN 'Arrendamiento Operativo'
                        WHEN cinmctas.ccinmo LIKE '322%' THEN 'Arrendamiento Financiero'
                        WHEN cinmctas.ccinmo LIKE '34%' AND cinmctas.ccinmo NOT LIKE '349%' THEN 'Intangibles'
                        WHEN NVL(cpar_parprel.ctainv, cinmctas.ccinmo) LIKE '349%' THEN 'Intangibles en curso'
                END                                                                     <alias name='Libro_AF'/>,
                (SELECT MAX(capuntes.asient)
                FROM capuntes
                WHERE capuntes.loteid = gcomfach.loteid)                                <alias name='crp_asiento_axional' />,
                NVL(cinmelem.auxchr2, crp_chv_xdocpro.nro_asien_ch)                     <alias name='crp_asiento_chavin' />,
                CASE WHEN YEAR(group_cinmcomp.fecbaj) = YEAR(TODAY) AND group_cinmcomp.tipcom = 'B' THEN ABS(cinmeval.iniele)
                        WHEN YEAR(group_cinmcomp.fecha) &lt; YEAR(TODAY) THEN cinmeval.invele
                        END                                                                <alias name='crp_saldo_inicial' />, 
                CASE WHEN YEAR(group_cinmcomp.fecha) = YEAR(TODAY)
                        AND group_cinmcomp.tipcom != 'J'
                        AND group_cinmcomp.docser NOT LIKE 'FINV%' THEN cinmeval.invele
                    END                                                                 <alias name='crp_imp_adqui' />,
                CASE WHEN group_cinmcomp.tipcom = 'M' THEN cinmeval.invele
                    ELSE 0
                    END                                                                 <alias name='Imp_Mejoras'/>,
                CASE WHEN group_cinmcomp.tipcom = 'B' THEN ABS(cinmeval.iniele) * -1
                    ELSE 0   
                END                                                                     <alias name='Imp_Ret_Baj' />,
                CASE WHEN group_cinmcomp.tipcom = 'J' THEN cinmeval.invele
                        WHEN group_cinmcomp.docser LIKE 'FINV%' THEN cinmeval.iniele
                    ELSE 0   
                END                                                                     <alias name='Imp_Otros_Ajus' />,
                cinmeval.iniele                                                         <alias name='imp_dep_acum_ejerc' />,
                CASE WHEN group_cinmcomp.tipcom = 'B' THEN ABS(cinmeval.iniele) * -1
                    ELSE 0   
                END                                                                     <alias name='imp_dep_ret_baj' />,
                ''                                                                      <alias name='imp_dep_otr_ajus' />,
                cinmeval.netele                                                         <alias name='neto' />,
                ''                                                                      <alias name='cod_quiron' />,
                group_cinmcomp.auxchr2                                                        <alias name='nro_aut_obra_quiron' />,
                cinmeval.estado                                                         <alias name='estado' />,
                (SELECT cniveles.nombre
                    FROM cniveles
                    WHERE cniveles.codigo = SUBSTR(crp_chv_mapcta1.ctaori, 1, 3)
                    AND cniveles.placon = 'PE')                                         <alias name='des_rub_cuenta' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                        ELSE ${mTmpTableCinmamorxConta}.import
                END                                                                     <alias name='dep_39' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                        ELSE ${mTmpTableCinmamorxConta}.import
                END                                                                     <alias name='dep_68' />,
                CASE WHEN NVL(group_cinmcomp.auxchr3, -1) = -1 THEN NVL(${mTmpTableCinmamorxConta}.import_depre, 0)
                        ELSE NVL(group_cinmcomp.auxchr3, 0) + NVL(${mTmpTableCinmamorxConta_Abril}.import_depre, 0)
                END                                                                     <alias name='deprec_trib_anual' />,
                group_cinmcomp.auxnum5                                                        <alias name='deprec_trib_acum' />,
                CASE WHEN group_cinmcomp.tipcom = 'B' THEN ABS(cinmeval.iniele) * -1
                    ELSE 0   
                END                                                                     <alias name='deprec_trib_baja' />,
                ${mTmpTableCinmamorxMeses}.codigo codigo1,
                ${mTmpTableCinmamorxMeses}.codigo codigo2,
                ${mTmpTableCinmamorxMeses}.codigo codigo3,
                CASE WHEN group_cinmcomp.codinm LIKE '%9999%' THEN 0
                        ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado1' />,
                CASE WHEN group_cinmcomp.codinm LIKE '%9999%' THEN 0
                        ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado2' />,
                CASE WHEN group_cinmcomp.codinm LIKE '%9999%' THEN 0
                        ELSE ${mTmpTableCinmamorxMeses}.depre_trib
                END                                                                     <alias name='amortizado3' />,
                
                <!-- Inventariable -->
                CASE WHEN cinmelem.auxchr3 = 1 THEN 'Si'
                        ELSE 'No'
                END                                                                     <alias name='inventariable' />
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
    
                    <join table='cinmeval'>
                        <on>cinmelem.empcode = cinmeval.empcode</on>
                        <on>cinmelem.codinm = cinmeval.codinm</on>
                        <on>cinmelem.codele = cinmeval.codele</on>
                    </join>

                    <join table='cempresa'>
                        <on>cinmelem.empcode = cempresa.empcode</on>
                        <on>cinmelem.codcta  = cinmctas.codigo</on>
                        <join type='left' table='cinmctas'>
                            <on>cempresa.placon  = cinmctas.placon</on>
                            <join type='left' table='ccuentas' alias='ccuentas1'>
                                <on>cinmctas.placon = ccuentas1.placon</on>
                                <on>cinmctas.ccinmo = ccuentas1.codigo</on>
                            </join>
                            <join type='left' table='ccuentas' alias='ccuentas2'>
                                <on>cinmctas.placon = ccuentas2.placon</on>
                                <on>cinmctas.ccamor = ccuentas2.codigo</on>
                            </join>
                            <join type='left' table='ccuentas' alias='ccuentas3'>
                                <on>cinmctas.placon = ccuentas3.placon</on>
                                <on>cinmctas.ccdota = ccuentas3.codigo</on>
                            </join>
                            <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta1'>
                                <on>cinmctas.ccinmo = crp_chv_mapcta1.cuenta</on>
                            </join>
                            <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta2'>
                                <on>cinmctas.ccamor = crp_chv_mapcta2.cuenta</on>
                            </join>
                            <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta3'>
                                <on>cinmctas.ccdota = crp_chv_mapcta3.cuenta</on>
                            </join>
                        </join>
                    </join>

                    <join type='left' table='cinmfgrp'>
                        <on>cinmelem.codgru = cinmfgrp.codigo</on>
                    </join>

                    <join type='left' table='cinmftab'>
                        <on>cinmelem.codgru = cinmftab.codgrp</on>
                        <on>cinmelem.codfis = cinmftab.codigo</on>
                    </join>
    
                    <join table='${mTmpTableGroupElemento}' alias='group_cinmcomp'>
                        <on>cinmelem.empcode = group_cinmcomp.empcode</on>
                        <on>cinmelem.codinm = group_cinmcomp.codinm</on>
                        <on>cinmelem.codele = group_cinmcomp.codele</on>
                        
                        <join type='left' table='ctercero'>
                            <on>group_cinmcomp.tercer = ctercero.codigo</on>
                        </join>
                        
                                
                        <join type="left" table="cinmelem_ppe">
                            <on>group_cinmcomp.seqno = cinmelem_ppe.ppe_seqno_compon</on>
                            <join type='left' table='cper_empleado'>
                                <on>cinmelem_ppe.ppe_codres = cper_empleado.cif</on>
                                <on>cper_empleado.estado = 'A'</on>
                                <on>LEN(cper_empleado.codigo) != 4</on>
                            </join>
                            <join type='left' table='cinmlopr'>
                                <on>cinmelem_ppe.ppe_codloc = cinmlopr.codigo</on>
                            </join>
                            <join type='left' table='cinmlosu'>
                                <on>cinmelem_ppe.ppe_codloc = cinmlosu.codigo</on>
                            </join>
                            <join type='left' table='cinmlopr' alias='cinmlopr_padre'>
                                <on>SUBSTR(cinmelem_ppe.ppe_codloc, 1, 6) = cinmlopr_padre.codigo</on>
                            </join>
                            <join type='left' table='cinmlosu' alias='cinmlosu_padre'>
                                <on>SUBSTR(cinmelem_ppe.ppe_codloc, 1, 6) = cinmlosu_padre.codigo</on>
                            </join>
                            <join type='left' table='gartmarc'>
                                <on>cinmelem_ppe.ppe_marca = gartmarc.codigo</on>
                                <join type='left' table='gartmode'>
                                    <on>gartmarc.codigo = gartmode.marca</on>
                                    <on>cinmelem_ppe.ppe_modelo = gartmode.modelo</on>
                                </join>
                            </join>
                        </join>
                        <join type='left' table='${mTmpTable}'>
                            <on>group_cinmcomp.docser = ${mTmpTable}.docser</on>
                            <on>${mTmpTable}.orden = 5</on>
                            <join type='left' table='gcomfach'>
                                <on>${mTmpTable}.docser = gcomfach.docser</on>
                                <join type='left' table='gcomfacd'>
                                    <on>gcomfach.tipdoc = gcomfacd.codigo</on>
                                </join>
                                <join type='left' table='crp_chv_xdocpro'>
                                    <on>gcomfach.loteid = crp_chv_xdocpro.loteid</on>
                                </join>
                            </join>
                            <join type='left' table='gdeparta'>
                                <on>${mTmpTable}.depart_sol = gdeparta.depart</on>
                                <join type='left' table='cseccion'>
                                    <on>gdeparta.seccio = cseccion.codigo</on>
                                </join>
                            </join>
                        </join>

                        
                        
                    </join>

                    <join type='left' table='${mTmpTableCinmamorxMeses}'>
                        <on>cinmelem.empcode = ${mTmpTableCinmamorxMeses}.empcode</on>
                        <on>cinmelem.codinm = ${mTmpTableCinmamorxMeses}.codinm</on>
                        <on>cinmelem.codele = ${mTmpTableCinmamorxMeses}.codele</on>
                    </join>
                    <join type='left' table='${mTmpTableCinmamorxConta}'>
                        <on>cinmelem.empcode = ${mTmpTableCinmamorxConta}.empcode</on>
                        <on>cinmelem.codinm = ${mTmpTableCinmamorxConta}.codinm</on>
                        <on>cinmelem.codele = ${mTmpTableCinmamorxConta}.codele</on>
                    </join>
                    <join type='left' table='${mTmpTableCinmamorxConta_Abril}'>
                        <on>cinmelem.empcode = ${mTmpTableCinmamorxConta_Abril}.empcode</on>
                        <on>cinmelem.codinm = ${mTmpTableCinmamorxConta_Abril}.codinm</on>
                        <on>cinmelem.codele = ${mTmpTableCinmamorxConta_Abril}.codele</on>
                    </join>

                    <join type='left' table='cpar_parpreh'>
                        <on>cinmelem.codpre = cpar_parpreh.codpre</on>
                        <join type='left' table='cpar_parprel'>
                            <on>cpar_parpreh.codpre = cpar_parprel.codpre</on>
                            <on>cinmelem.codpar = cpar_parprel.codpar</on>
                        </join>
                    </join>
                </join>
            </from>
            <where>
                cinmhead.estcom NOT IN ('N', 'C') AND
                ${mSqlCond}
            </where>
            <order>
                1, 74
            </order>
        </select>
    `);

let mRsPivot = rsElementos.pivot(options => {
    options.setPivotColumnNames(['codigo1', 'codigo2', 'codigo3']);
    options.setMeasureColumnNames(['amortizado1', 'amortizado2', 'amortizado3']);
});

let rs = new Ax.rs.Reader().memory(options => {
    options.setColumnNames([
        'codele',
        'nomele',
        'auxchr1',
        'crp_medida',
        'crp_grupo_bien',
        'crp_descripcion_bien',
        'ccamor',
        'crp_description1',
        'crp_cuenta_depre_chv',
        'crp_descri_cuenta_chv',
        'ccdota',
        'crp_description2',
        'cdotach',
        'ppe_codloc',
        'nomlug',
        'crp_ubi_padre',
        'crp_ubi_padre_descri',
        'crp_codigo_resp',
        'crp_descri_resp',
        'depart',
        'nomdep',

        'crp_componente',
        'crp_description_componente',

        'crp_periodo',
        'fecbaj',
        'crp_causal',
        'motivo',
        'crp_cod_proveedor',
        'nombre',
        'cif',

        'crp_tipologia',
        'crp_descrip_tipologia',
        'docser',
        'numfac',
        'fecfac',
        'crp_fecini_depre',
        'vufina',
        'vutri',
        'pdfina',
        'pdtrib',
        'ppe_marca',
        'nommar',
        'ppe_modelo',
        'nommod',
        'ppe_numser',
        'ppe_label_id',
        'seccio',
        'nomsec',
        'crp_cuenta_inmo',
        'crp_cuenta_noinmo',
        'crp_cuenta_chv',
        'crp_inversion',
        'crp_descri_inversion',
        'crp_partida',
        'crp_descri_partida',
        'Nro_Contrato_Arr',
        'Fecha_Contrato_Arr',
        'Nro_Cuotas_Arr',
        'Monto_Total_Arr',
        'Libro_AF',
        'crp_asiento_axional',
        'crp_asiento_chavin',
        'crp_saldo_inicial',
        'crp_imp_adqui',
        'Imp_Mejoras',
        'Imp_Ret_Baj',
        'Imp_Otros_Ajus',
        'imp_dep_acum_ejerc',
        'dep_39',
        'c1',
        'c2',
        'c3',
        'c4',
        'c5',
        'c6',
        'c7',
        'c8',
        'c9',
        'c10',
        'c11',
        'c12',
        'c13',
        'dep_68',
        'c14',
        'c15',
        'c16',
        'c17',
        'c18',
        'c19',
        'c20',
        'c21',
        'c22',
        'c23',
        'c24',
        'c25',
        'c26',
        'imp_dep_ret_baj',
        'imp_dep_otr_ajus',
        'neto',
        'cod_quiron',
        'nro_aut_obra_quiron',
        'estado',
        'des_rub_cuenta',
        'deprec_trib_acum',
        'deprec_trib_anual',
        'c27',
        'c28',
        'c29',
        'c30',
        'c31',
        'c32',
        'c33',
        'c34',
        'c35',
        'c36',
        'c37',
        'c38',
        'c39',
        'deprec_trib_baja',
        'inventariable'
    ]);
    options.setColumnTypes([
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,

        Ax.sql.Types.CHAR,

        Ax.sql.Types.CHAR,

        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,

        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE,
        Ax.sql.Types.DATE,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR
    ]);
});

for (let mRowPivot of mRsPivot) {
    rs.rows().add(mRowPivot);
}

return rs;