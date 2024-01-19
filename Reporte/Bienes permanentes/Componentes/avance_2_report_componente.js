

// AVANCE 2 DE REPORTE

// Ajustar el deprec_trib_acum = cinmcomp.auxnum5 + deprec_trib_anual(2023)
// alcanzar los 90M


let mSqlCond = `1=1`;
var mIntYear = 2024;

let mTmpTableCinmamorxMeses = Ax.db.getTempTableName(`tmp_cinmamor_x_meses`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxMeses}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxMeses}'>
            <columns>
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
                cinmcomp.codcom,
                cperiodo.ejerci,
                cperiodo.codigo,
                cperiodo.nomper,
                SUM(CASE WHEN cinmamor.estado = 'C' AND cinmamor.fecfin >= cperiodo.fecini AND cinmamor.fecfin &lt;= cperiodo.fecfin THEN cinmamor.import
                        ELSE 0
                    END)                                                    <alias name='amortizado' />,
                SUM(CASE WHEN cinmamor.estado = 'C' AND cinmamor.fecfin >= cperiodo.fecini AND cinmamor.fecfin &lt;= cperiodo.fecfin THEN cinmamor.impmax
                        ELSE 0
                    END)                                                    <alias name='depre_trib' />
            </columns>
            <from table='cperiodo'>
                    <join table='cinmcomp'>
                        <on>cperiodo.empcode = cinmcomp.empcode</on>

                        <join type='left' table='cinmamor'>
                            <on>cinmcomp.empcode = cinmamor.empcode</on>
                            <on>cinmcomp.codinm = cinmamor.codinm</on>
                            <on>cinmcomp.codele = cinmamor.codele</on>
                            <on>cinmcomp.codcom = cinmamor.codcom</on>
                            <on>cinmcomp.numhis = cinmamor.numhis</on>
                        </join>
                    </join>
            </from>
            <where>
                cperiodo.ejerci = ${mIntYear}
                AND cperiodo.empcode = '125'
            </where>
            <group>
                1, 2, 3, 4, 5, 6, 7
            </group>
        </select>
    `);

let mTmpTableCinmamorxConta = Ax.db.getTempTableName(`tmp_cinmamor_x_conta`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxConta}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxConta}'>
            <columns>
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
                cinmcomp.codcom,
                SUM(cinmamor.import) <alias name='import' />,
                SUM(cinmamor.impmax) <alias name='import_depre' />
            </columns>
            <from table='cinmcomp'>
                <join table='cinmamor'>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                    <on>cinmamor.fecfin BETWEEN MDY(1,1,${mIntYear}) AND MDY(12,31,${mIntYear})</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3, 4
            </group>
        </select>
    `);


let mTmpTableCinmamorEjercicio = Ax.db.getTempTableName(`tmp_cinmamor_al_ejercicio`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorEjercicio}`);
Ax.db.execute(`
            <select intotemp='${mTmpTableCinmamorEjercicio}'>
                <columns>
                    cinmcomp.empcode,
                    cinmcomp.codinm,
                    cinmcomp.codele,
                    cinmcomp.codcom,
                    SUM(cinmamor.import) <alias name='import' />,
                    SUM(cinmamor.impmax) <alias name='import_depre' />
                </columns>
                <from table='cinmcomp'>
                    <join table='cinmamor'>
                        <on>cinmcomp.codinm = cinmamor.codinm</on>
                        <on>cinmcomp.codele = cinmamor.codele</on>
                        <on>cinmcomp.codcom = cinmamor.codcom</on>
                        <on>cinmcomp.numhis = cinmamor.numhis</on>
                        <on>YEAR(cinmamor.fecfin) &lt; ${mIntYear}</on>
                        <on>cinmamor.estado = 'C'</on>
                    </join>
                </from>
                <group>
                    1, 2, 3, 4
                </group>
            </select>
        `);


let mTmpTableCinmamorAcumBajas = Ax.db.getTempTableName(`tmp_cinmamor_acum_bajas`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorAcumBajas}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorAcumBajas}'>
            <columns>
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
                cinmcomp.codcom,
                SUM(cinmamor.import) <alias name='import' />,
                SUM(cinmamor.impmax) <alias name='import_depre' />
            </columns>
            <from table='cinmcomp'>
                <join table='cinmamor'>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                    <on>cinmamor.fecfin &lt;= cinmcomp.fecbaj</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <where>
                cinmcomp.tipcom = 'B'
            </where>
            <group>
                1, 2, 3, 4
            </group>
        </select>
    `);


let mTmpTableCinmamorxConta_Abril = Ax.db.getTempTableName(`tmp_cinmamor_x_conta_abril`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxConta_Abril}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxConta_Abril}'>
            <columns>
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
                cinmcomp.codcom,
                SUM(cinmamor.import) <alias name='import' />,
                SUM(cinmamor.impmax) <alias name='import_depre' />
            </columns>
            <from table='cinmcomp'>
                <join table='cinmamor'>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                    <on>cinmamor.fecfin BETWEEN MDY(4,1,2023) AND MDY(12,31,${mIntYear})</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3, 4
            </group>
        </select>
    `);

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
                                                                FROM cinmcomp
                                                               WHERE ${mSqlCond}))
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
                                                          FROM cinmcomp
                                                         WHERE ${mSqlCond})))
           
          INTO TEMP ${mTmpTable} WITH NO LOG
    `);

let mTmpTableRsComp = Ax.db.getTempTableName(`tmp_table_rs_comp`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableRsComp}`);
Ax.db.execute(`
        <select intotemp = '${mTmpTableRsComp}'>
            <columns>
                cinmcomp.codcom,
                cinmcomp.nomcom,
                cinmcomp.auxchr1,
                'UND'                                                       <alias name='crp_medida' />,
                cinmcomp.codinm                                             <alias name='crp_grupo_bien' />,
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
                cinmelem.codele                                              <alias name='crp_elemento' />,
                cinmelem.nomele                                              <alias name='crp_description_elemento' />,
                YEAR(cinmcomp.fecha) || LPAD(MONTH(cinmcomp.fecha), 2, '0')  <alias name='crp_periodo' />,
                cinmcomp.fecbaj,
                cinmcomp.auxchr4                                            <alias name='crp_causal' />,
                cinmcomp.motivo, 
                cinmcomp.tercer                                             <alias name='crp_cod_proveedor' />,
                ctercero.nombre,
                ctercero.cif,
                gcomfach.tipdoc                                             <alias name='crp_tipologia' />,
                gcomfacd.nomdoc                                             <alias name='crp_descrip_tipologia' />,
                cinmcomp.docser,
                cinmcomp.numfac,
                cinmcomp.fecfac,
                cinmcomp.fecini                                             <alias name='crp_fecini_depre' />,
                cinmftab.numeje                                             <alias name='vutri' />,
                cinmcval.numeje                                             <alias name='vufina' />,
                cinmcval.porcen                                             <alias name='pdfina' />,
                cinmftab.porcen                                             <alias name='pdtrib' />,
                cinmelem_ppe.ppe_marca,
                gartmarc.nommar,
                cinmelem_ppe.ppe_modelo,
                gartmode.nommod,
                cinmelem_ppe.ppe_numser,
                cinmelem_ppe.ppe_label_id,
                gdeparta.seccio,
                cseccion.nomsec,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN cpar_parprel.ctainv
                     ELSE cinmctas.ccinmo
                END                                                                                     <alias name='crp_cuenta_inmo' />,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN (SELECT c.nombre
                                                                FROM ccuentas c
                                                               WHERE c.placon = 'PE'
                                                                 AND c.codigo = cpar_parprel.ctainv)
                     ELSE ccuentas1.nombre
                END                                                                                     <alias name='crp_cuenta_noinmo' />,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN (SELECT c.ctaori
                                                                FROM crp_chv_mapcta c
                                                               WHERE c.cuenta = cpar_parprel.ctainv)
                     ELSE crp_chv_mapcta1.ctaori
                END                                                                                     <alias name='crp_cuenta_chv' />,
                cinmelem.codpre                                                                         <alias name='crp_inversion' />,
                cpar_parpreh.nompre                                                                     <alias name='crp_descri_inversion' />,
                cinmelem.codpar                                                                         <alias name='crp_partida' />,
                cpar_parprel.nompar                                                                     <alias name='crp_descri_partida' />,
    
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.docser END                          <alias name='nro_contrato_arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.fecfac END                          <alias name='fecha_contrato_arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmftab.numeje END                          <alias name='nro_cuotas_arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcval.invcom END                          <alias name='monto_total_arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '33%' AND cinmctas.ccinmo NOT LIKE '339%' THEN 'Activos fijos'
                     WHEN NVL(cpar_parprel.ctainv, cinmctas.ccinmo) LIKE '339%' THEN 'Obras en curso'
                     WHEN cinmctas.ccinmo LIKE '321%' THEN 'Arrendamiento Operativo'
                     WHEN cinmctas.ccinmo LIKE '322%' THEN 'Arrendamiento Financiero'
                     WHEN cinmctas.ccinmo LIKE '34%' AND cinmctas.ccinmo NOT LIKE '349%' THEN 'Intangibles'
                     WHEN NVL(cpar_parprel.ctainv, cinmctas.ccinmo) LIKE '349%' THEN 'Intangibles en curso'
                END                                                                                     <alias name='libro_af'/>,
                (SELECT MAX(capuntes.asient)
                FROM capuntes
                WHERE capuntes.loteid = gcomfach.loteid)                                                <alias name='crp_asiento_axional' />,
                NVL(cinmelem.auxchr2, crp_chv_xdocpro.nro_asien_ch)                                     <alias name='crp_asiento_chavin' />,
                NVL(CASE WHEN YEAR(cinmcomp.fecbaj) = ${mIntYear} AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                     WHEN YEAR(cinmcomp.fecha) &lt; ${mIntYear} THEN cinmcval.invcom
                     ELSE 0
                     END, 0)                                                                            <alias name='crp_saldo_inicial' />,
                NVL(CASE WHEN YEAR(cinmcomp.fecha) = ${mIntYear}
                        AND cinmcomp.tipcom != 'J'
                        AND (cinmcomp.docser NOT LIKE 'FINV%'
                            AND cinmcomp.docser NOT LIKE 'RFIN%'
                            AND cinmcomp.docser NOT LIKE 'SFIN%') THEN cinmcval.invcom
                     ELSE 0
                    END, 0)                                                                 <alias name='crp_imp_adqui' />,
                NVL(CASE WHEN cinmcomp.tipcom = 'M' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    ELSE 0
                    END, 0)                                                                 <alias name='imp_mejoras'/>,
                NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END, 0)                                                                     <alias name='imp_ret_baj' />,
                NVL(CASE WHEN cinmcomp.tipcom = 'J' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                         WHEN cinmcomp.docser LIKE 'FINV%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                         WHEN cinmcomp.docser LIKE 'RFIN%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                         WHEN cinmcomp.docser LIKE 'SFIN%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    ELSE 0   
                END, 0)                                                                     <alias name='imp_otros_ajus' />,
                CASE WHEN cinmcomp.tipcom != 'B' THEN NVL(${mTmpTableCinmamorEjercicio}.import, 0)
                     ELSE 0
                END                                                         <alias name='imp_dep_acum_ejerc' />, <!-- sumar fecha <= year cinmamor-->
                NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END, 0)                                                                     <alias name='imp_dep_ret_baj' />,

                0                                                                      <alias name='imp_dep_otr_ajus' />,
                cinmcval.netcom                                                         <alias name='neto' />, <!-- suma  -->
                ''                                                                      <alias name='cod_quiron' />,
                cinmcomp.auxchr2                                                        <alias name='nro_aut_obra_quiron' />,
                cinmcval.estado                                                         <alias name='estado' />,
                (SELECT cniveles.nombre
                   FROM cniveles
                  WHERE cniveles.codigo = SUBSTR(crp_chv_mapcta1.ctaori, 1, 3)
                    AND cniveles.placon = 'PE')                                         <alias name='des_rub_cuenta' />,
                NVL(CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxConta}.import
                END, 0)                                                                     <alias name='dep_39' />,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxConta}.import
                END                                                                     <alias name='dep_68' />,
                NVL(${mTmpTableCinmamorxConta}.import_depre, 0)                         <alias name='deprec_trib_anual' />,
                (cinmcomp.auxnum5 + NVL(${mTmpTableCinmamorEjercicio}.import_depre, 0))                                                        <alias name='deprec_trib_acum' />,
                CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(NVL(${mTmpTableCinmamorAcumBajas}.import_depre, cinmcval.inicom)) * -1
                    ELSE 0   
                END                                                                     <alias name='deprec_trib_baja' />, <!-- cinmamor.fecfin <= fecbaj -->
                <!-- Inventariable -->
                CASE WHEN cinmelem.auxchr3 = 1 THEN 'Si'
                     ELSE 'No'
                END                                                                     <alias name='inventariable' />,
                <!-- Grupo Inmovilizado -->
                cinmhead.codgrp                                                         <alias name='grp_inmovilizado' />,
                
                ${mTmpTableCinmamorxMeses}.codigo codigo1,
                ${mTmpTableCinmamorxMeses}.codigo codigo2,
                ${mTmpTableCinmamorxMeses}.codigo codigo3,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado1' />,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado2' />,
                CASE WHEN cinmcomp.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.depre_trib
                END                                                                     <alias name='amortizado3' />

            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join table='cinmcomp'>
                        <on>cinmelem.empcode = cinmcomp.empcode</on>
                        <on>cinmelem.codinm = cinmcomp.codinm</on>
                        <on>cinmelem.codele = cinmcomp.codele</on>
                        <join table='cinmcval'>
                            <on>cinmcomp.empcode = cinmcval.empcode</on>
                            <on>cinmcomp.codinm = cinmcval.codinm</on>
                            <on>cinmcomp.codele = cinmcval.codele</on>
                            <on>cinmcomp.codcom = cinmcval.codcom</on>
                            <on>cinmcomp.numhis = cinmcomp.numhis</on>
                        </join>
                        <join table='cempresa'>
                            <on>cinmcomp.empcode = cempresa.empcode</on>
                            <on>cinmcomp.codcta  = cinmctas.codigo</on>
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
                        <join type='left' table='ctercero'>
                            <on>cinmcomp.tercer = ctercero.codigo</on>
                        </join>
                        <join type='left' table='cinmfgrp'>
                            <on>cinmcomp.codgru = cinmfgrp.codigo</on>
                        </join>
                        <join type='left' table='cinmftab'>
                            <on>cinmcomp.codgru = cinmftab.codgrp</on>
                            <on>cinmcomp.codfis = cinmftab.codigo</on>
                        </join>        
                        <join type="left" table="cinmelem_ppe">
                            <on>cinmcomp.seqno = cinmelem_ppe.ppe_seqno_compon</on>
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
                            <on>cinmcomp.docser = ${mTmpTable}.docser</on>
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
                        <join type='left' table='${mTmpTableCinmamorxMeses}'>
                            <on>cinmcomp.empcode = ${mTmpTableCinmamorxMeses}.empcode</on>
                            <on>cinmcomp.codinm = ${mTmpTableCinmamorxMeses}.codinm</on>
                            <on>cinmcomp.codele = ${mTmpTableCinmamorxMeses}.codele</on>
                            <on>cinmcomp.codcom = ${mTmpTableCinmamorxMeses}.codcom</on>
                        </join>
                        <join type='left' table='${mTmpTableCinmamorxConta}'>
                            <on>cinmcomp.empcode = ${mTmpTableCinmamorxConta}.empcode</on>
                            <on>cinmcomp.codinm = ${mTmpTableCinmamorxConta}.codinm</on>
                            <on>cinmcomp.codele = ${mTmpTableCinmamorxConta}.codele</on>
                            <on>cinmcomp.codcom = ${mTmpTableCinmamorxConta}.codcom</on>
                        </join>
                        <join type='left' table='${mTmpTableCinmamorxConta_Abril}'>
                            <on>cinmcomp.empcode = ${mTmpTableCinmamorxConta_Abril}.empcode</on>
                            <on>cinmcomp.codinm = ${mTmpTableCinmamorxConta_Abril}.codinm</on>
                            <on>cinmcomp.codele = ${mTmpTableCinmamorxConta_Abril}.codele</on>
                            <on>cinmcomp.codcom = ${mTmpTableCinmamorxConta_Abril}.codcom</on>
                        </join>
                        <join type='left' table='${mTmpTableCinmamorAcumBajas}'>
                            <on>cinmcomp.empcode = ${mTmpTableCinmamorAcumBajas}.empcode</on>
                            <on>cinmcomp.codinm = ${mTmpTableCinmamorAcumBajas}.codinm</on>
                            <on>cinmcomp.codele = ${mTmpTableCinmamorAcumBajas}.codele</on>
                            <on>cinmcomp.codcom = ${mTmpTableCinmamorAcumBajas}.codcom</on>
                        </join>
                        <join type='left' table='${mTmpTableCinmamorEjercicio}'>
                            <on>cinmcomp.empcode = ${mTmpTableCinmamorEjercicio}.empcode</on>
                            <on>cinmcomp.codinm = ${mTmpTableCinmamorEjercicio}.codinm</on>
                            <on>cinmcomp.codele = ${mTmpTableCinmamorEjercicio}.codele</on>
                            <on>cinmcomp.codcom = ${mTmpTableCinmamorEjercicio}.codcom</on>
                        </join>
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
            
        </select>
    `);


/**
 *
 */

var rsComponentes = Ax.db.executeQuery(`
        <select>
            <columns>
                codcom,
                nomcom,
                auxchr1,
                crp_medida,
                crp_grupo_bien,
                crp_descripcion_bien,
                ccamor,
                crp_description1,
                crp_cuenta_depre_chv,
                crp_descri_cuenta_chv,
                ccdota,
                crp_description2,
                cdotach,
                ppe_codloc,
                nomlug,
                crp_ubi_padre,
                crp_ubi_padre_descri,
                crp_codigo_resp,
                crp_descri_resp,
                depart,
                nomdep,
                crp_elemento,
                crp_description_elemento,
                crp_periodo,
                fecbaj,
                crp_causal,
                motivo, 
                crp_cod_proveedor,
                nombre,
                cif,
                crp_tipologia,
                crp_descrip_tipologia,
                docser,
                numfac,
                fecfac,
                crp_fecini_depre,
                vutri,
                vufina,
                pdfina,
                pdtrib,
                ppe_marca,
                nommar,
                ppe_modelo,
                nommod,
                ppe_numser,
                ppe_label_id,
                seccio,
                nomsec,
                crp_cuenta_inmo,
                crp_cuenta_noinmo,
                crp_cuenta_chv,
                crp_inversion,
                crp_descri_inversion,
                crp_partida,
                crp_descri_partida,
    
                nro_contrato_arr,
                fecha_contrato_arr,
                nro_cuotas_arr,
                monto_total_arr,
                libro_af,
                crp_asiento_axional,
                crp_asiento_chavin,
                crp_saldo_inicial,
                crp_imp_adqui,
                imp_mejoras,
                imp_ret_baj,
                imp_otros_ajus,
                imp_dep_acum_ejerc,
                imp_dep_ret_baj,
                imp_dep_otr_ajus,
                
                ((crp_saldo_inicial+crp_imp_adqui+imp_mejoras+imp_ret_baj+imp_otros_ajus)
                 - (imp_dep_acum_ejerc+dep_39+imp_dep_ret_baj+imp_dep_otr_ajus)) neto,
                 
                cod_quiron,
                nro_aut_obra_quiron,
                estado,
                des_rub_cuenta,
                dep_39,
                dep_68,
                deprec_trib_anual,
                deprec_trib_acum,
                deprec_trib_baja,
                inventariable,
                grp_inmovilizado,
                
                codigo1,
                codigo2,
                codigo3,
                amortizado1,
                amortizado2,
                amortizado3
            </columns>
            <from table='${mTmpTableRsComp}' />
            <order>
                1, 83
            </order>
        </select>
    `);

let mRsPivot = rsComponentes.pivot(options => {
    options.setPivotColumnNames(['codigo1', 'codigo2', 'codigo3']);
    options.setMeasureColumnNames(['amortizado1', 'amortizado2', 'amortizado3']);
});

let rs = new Ax.rs.Reader().memory(options => {
    options.setColumnNames([
        'codcom',
        'nomcom',
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
        'crp_elemento',
        'crp_description_elemento',
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
        'vutri',
        'vufina',
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
        'nro_contrato_arr',
        'fecha_contrato_arr',
        'nro_cuotas_arr',
        'monto_total_arr',
        'libro_af',
        'crp_asiento_axional',
        'crp_asiento_chavin',
        'crp_saldo_inicial',
        'crp_imp_adqui',
        'imp_mejoras',
        'imp_ret_baj',
        'imp_otros_ajus',
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
        'dep_68',
        'c13',
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
        'imp_dep_ret_baj',
        'imp_dep_otr_ajus',
        'neto',
        'cod_quiron',
        'nro_aut_obra_quiron',
        'estado',
        'des_rub_cuenta',
        'deprec_trib_acum',
        'deprec_trib_anual',
        'c25',
        'c26',
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
        'deprec_trib_baja',
        'inventariable',
        'grp_inmovilizado'
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
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR
    ]);
});

for (let mRowPivot of mRsPivot) {
    rs.rows().add(mRowPivot);
}

return rs;