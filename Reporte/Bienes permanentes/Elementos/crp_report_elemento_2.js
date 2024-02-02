
let mSqlCond = '1=1';
var mIntYear = 2024;

/**
 * Depreciación mensual correspondiente al ejercicio.
 */
let mTmpTableCinmamorxMeses = Ax.db.getTempTableName(`tmp_cinmamor_x_meses`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxMeses}`);
Ax.db.execute(`
        <select intotemp='${mTmpTableCinmamorxMeses}'>
            <columns>
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
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
                1, 2, 3, 4, 5, 6
            </group>
        </select>
    `);

/**
 * Depreciación anual correspondiente al ejercicio.
 */
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

/**
 * Depreciación acumulada correspondiente desde el 2023 hasta al ejercicio.
 */
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
                    <on>cinmamor.fecfin BETWEEN MDY(1,1,2023) AND MDY(12,31,${mIntYear})</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3, 4
            </group>
        </select>
    `);

/**
 * Depreciación acumulada para bajas correspondiente hasta la fecha de baja.
 */
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

/**
 * Depreciación acumulada correspondiente desde Abril del 2023 hasta el ejercicio.
 */
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

let mTmpGrpCinmelem = Ax.db.getTempTableName(`tmp_grp_cinmelem`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpGrpCinmelem}`);
Ax.db.execute(`
    <select intotemp='${mTmpGrpCinmelem}'>
        <columns>
            cinmelem.empcode,
            cinmelem.codinm,
            cinmelem.codele,

            MAX(cinmcomp.codcom) codcom,
            MAX(cinmcomp.nomcom) nomcom,
            MAX(cinmcomp.auxchr1) auxchr1,
            MAX(cinmctas.ccamor)                                                                <alias name='ccamor' />,
            MAX(ccuentas2.nombre)                                                               <alias name='crp_description1' />,
            MAX(crp_chv_mapcta2.ctaori)                                                         <alias name='crp_cuenta_depre_chv'/>,
            MAX(crp_chv_mapcta2.concep)                                                         <alias name='crp_descri_cuenta_chv'/>,
            MAX(cinmctas.ccdota)                                                                <alias name='ccdota' />,
            MAX(ccuentas3.nombre)                                                               <alias name='crp_description2' />,
            MAX(crp_chv_mapcta3.ctaori)                                                         <alias name='cdotach'/>,
            MAX(cinmelem_ppe.ppe_codloc)                                                        <alias name='ppe_codloc' />,
            MAX(cinmlosu.nomlug)                                                                <alias name='nomlug' />,
            MAX(cinmlosu_padre.nomlug)                                                          <alias name='crp_ubi_padre_descri' />,
            MAX(cinmelem_ppe.ppe_codres)                                                        <alias name='crp_codigo_resp' />,
            MAX(cper_empleado.nomemp||' '|| cper_empleado.apeemp)                               <alias name='crp_descri_resp' />,
            MAX(${mTmpTable}.depart_sol)                                                        <alias name='depart' />,
            MAX(gdeparta.nomdep)                                                                <alias name='nomdep' />,
            MAX(cinmcomp.fecha)                                                                 <alias name='fecha' />,
            MAX(cinmcomp.fecbaj)                                                                <alias name='fecbaj' />,
            MAX(cinmcomp.auxchr4)                                                               <alias name='auxchr4' />,
            MAX(cinmcomp.motivo)                                                                <alias name='motivo' />,
            MAX(cinmcomp.tercer)                                                                <alias name='tercer' />,
            MAX(ctercero.nombre)                                                                <alias name='nombre'/>,
            MAX(ctercero.cif)                                                                   <alias name='cif'/>,
            MAX(gcomfach.tipdoc)                                                                <alias name='crp_tipologia' />,
            MAX(gcomfacd.nomdoc)                                                                <alias name='crp_descrip_tipologia' />,
            MAX(cinmcomp.docser)                                                                <alias name='docser' />,
            MAX(cinmcomp.numfac)                                                                <alias name='numfac' />,
            MAX(cinmcomp.fecfac)                                                                <alias name='fecfac' />,
            MAX(cinmcomp.fecini)                                                                <alias name='fecini' />,
            MAX(cinmftab.numeje)                                                                <alias name='vutri' />,
            MAX(cinmcval.numeje)                                                                <alias name='numeje' />,
            MAX(cinmcval.porcen)                                                                <alias name='porcen' />,
            MAX(cinmftab.porcen)                                                                <alias name='pdtrib' />,
            MAX(cinmelem_ppe.ppe_marca)                                                         <alias name='ppe_marca' />,
            MAX(gartmarc.nommar)                                                                <alias name='nommar' />,
            MAX(cinmelem_ppe.ppe_modelo)                                                        <alias name='ppe_modelo' />,
            MAX(gartmode.nommod)                                                                <alias name='nommod' />,
            MAX(cinmelem_ppe.ppe_numser)                                                        <alias name='ppe_numser' />,
            MAX(cinmelem_ppe.ppe_label_id)                                                      <alias name='ppe_label_id' />,
            MAX(gdeparta.seccio)                                                                <alias name='seccio' />,
            MAX(cseccion.nomsec)                                                                <alias name='nomsec' />,
            MAX(cinmctas.ccinmo)                                                                <alias name='ccinmo' />,
            MAX(ccuentas1.nombre)                                                               <alias name='crp_cuenta_noinmo' />,
            MAX(crp_chv_mapcta1.ctaori)                                                         <alias name='ctaori' />,
            MAX(CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.docser END)                 <alias name='nro_contrato_arr'/>,
            MAX(CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.fecfac END)                 <alias name='fecha_contrato_arr'/>,
            MAX(NVL(CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmftab.numeje
                        ELSE 0
                    END, 0))                                                                    <alias name='nro_cuotas_arr'/>,
            SUM(NVL(CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcval.invcom
                        ELSE 0
                    END, 0))                                                                    <alias name='monto_total_arr'/>,
            SUM(NVL(CASE WHEN YEAR(cinmcomp.fecbaj) = ${mIntYear} AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                        WHEN YEAR(cinmcomp.fecha) &lt; ${mIntYear} THEN cinmcval.invcom
                        ELSE 0
                END, 0))                                                                        <alias name='crp_saldo_inicial' />,
            SUM(NVL(CASE WHEN YEAR(cinmcomp.fecha) = ${mIntYear}
                    AND cinmcomp.tipcom != 'J'
                    AND (cinmcomp.docser NOT LIKE 'FINV%'
                        AND cinmcomp.docser NOT LIKE 'RFIN%'
                        AND cinmcomp.docser NOT LIKE 'SFIN%'
                        AND cinmcomp.docser NOT LIKE 'NFIN%') THEN cinmcval.invcom
                    ELSE 0
                END, 0))                                                                        <alias name='crp_imp_adqui' />,
            SUM(NVL(CASE WHEN cinmcomp.tipcom = 'M' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    ELSE 0
                END, 0))                                                                        <alias name='imp_mejoras'/>,
            SUM(NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END, 0))                                                                        <alias name='imp_ret_baj' />,
            SUM(NVL(CASE WHEN cinmcomp.tipcom = 'J' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'FINV%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'RFIN%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'SFIN%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'NFIN%' AND YEAR(cinmcomp.fecha) = ${mIntYear} THEN cinmcval.invcom
                    ELSE 0   
                END, 0))                                                                    <alias name='imp_otros_ajus' />,

            SUM(CASE WHEN cinmcomp.tipcom != 'B' THEN NVL(cinmcval.inicom, 0) + 
                                                      NVL(${mTmpTableCinmamorEjercicio}.import, 0) +
                                                      NVL(CASE WHEN cinmcomp.tipcom = 'B' 
                                                                    AND YEAR(cinmcomp.fecbaj) &lt; ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                                                          ELSE 0 END, 0)
                     ELSE 0
                END)                                                                        <alias name='imp_dep_acum_ejerc' />,

            SUM(NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                ELSE 0   
            END, 0))                                                                        <alias name='imp_dep_ret_baj' />,
            MAX(cinmcomp.auxchr2)                                                           <alias name='auxchr2' />,
            MAX(cinmcval.estado)                                                            <alias name='estado' />,
            SUM(NVL(${mTmpTableCinmamorxConta}.import, 0))                                  <alias name='import' />,
            SUM(NVL(${mTmpTableCinmamorxConta}.import_depre, 0))                            <alias name='deprec_trib_anual' />,
            SUM(NVL(cinmcomp.auxnum5, 0) + NVL(${mTmpTableCinmamorEjercicio}.import_depre, 0) + 
                NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) &lt; ${mIntYear} THEN ABS(cinmcval.inicom) * -1
                         ELSE 0
                    END, 0)
            )                                                                               <alias name='deprec_trib_acum' />,
            SUM(NVL(CASE WHEN cinmcomp.tipcom = 'B' AND YEAR(cinmcomp.fecbaj) = ${mIntYear} THEN ABS(NVL(${mTmpTableCinmamorAcumBajas}.import_depre, cinmcval.inicom)) * -1
                ELSE 0   
            END, 0))                                                                        <alias name='deprec_trib_baja' />,
            MAX(gcomfach.loteid)                                                            <alias name='loteid' />,
            MAX(crp_chv_xdocpro.nro_asien_ch)                                               <alias name='nro_asien_ch' />
        </columns>
        <from table='cinmelem'>
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
        </from>
        <group>
            1,2,3
        </group>
    </select>
`);

mSqlCond = mSqlCond.toString().replaceAll('cinmcomp', 'cinmelem');
var rsComponentes = Ax.db.executeQuery(`
        <select>
            <columns>
                cinmelem.codele                                              <alias name='crp_elemento' />,
                cinmelem.nomele                                              <alias name='crp_description_elemento' />,
                tmp_grp_cinmelem.auxchr1,
                'UND'                                                       <alias name='crp_medida' />,
                cinmelem.codinm                                             <alias name='crp_grupo_bien' />,
                cinmhead.nominm                                             <alias name='crp_descripcion_bien' />,
                tmp_grp_cinmelem.ccamor,
                tmp_grp_cinmelem.crp_description1                                            <alias name='crp_description1' />, 
                tmp_grp_cinmelem.crp_cuenta_depre_chv                                      <alias name='crp_cuenta_depre_chv'/>,
                tmp_grp_cinmelem.crp_descri_cuenta_chv                                      <alias name='crp_descri_cuenta_chv'/>,
                tmp_grp_cinmelem.ccdota,
                tmp_grp_cinmelem.crp_description2                                            <alias name='crp_description2' />,
                tmp_grp_cinmelem.cdotach                                      <alias name='cdotach'/>,
                tmp_grp_cinmelem.ppe_codloc,
                tmp_grp_cinmelem.nomlug,
                SUBSTR(tmp_grp_cinmelem.ppe_codloc, 1, 6)                       <alias name='crp_ubi_padre' />,
                tmp_grp_cinmelem.crp_ubi_padre_descri                                       <alias name='crp_ubi_padre_descri' />,
                tmp_grp_cinmelem.crp_codigo_resp                                     <alias name='crp_codigo_resp' />,
                tmp_grp_cinmelem.crp_descri_resp            <alias name='crp_descri_resp' />,
                tmp_grp_cinmelem.depart                                     <alias name='depart' />,
                tmp_grp_cinmelem.nomdep,
                tmp_grp_cinmelem.codcom,
                tmp_grp_cinmelem.nomcom,
                YEAR(tmp_grp_cinmelem.fecha) || LPAD(MONTH(tmp_grp_cinmelem.fecha), 2, '0') <alias name='crp_periodo' />,
                tmp_grp_cinmelem.fecbaj,
                tmp_grp_cinmelem.auxchr4                                            <alias name='crp_causal' />,
                tmp_grp_cinmelem.motivo, 
                tmp_grp_cinmelem.tercer                                             <alias name='crp_cod_proveedor' />,
                tmp_grp_cinmelem.nombre,
                tmp_grp_cinmelem.cif,
                tmp_grp_cinmelem.crp_tipologia                                             <alias name='crp_tipologia' />,
                tmp_grp_cinmelem.crp_descrip_tipologia                                             <alias name='crp_descrip_tipologia' />,
                tmp_grp_cinmelem.docser,
                tmp_grp_cinmelem.numfac,
                tmp_grp_cinmelem.fecfac,
                tmp_grp_cinmelem.fecini                                             <alias name='crp_fecini_depre' />,
                tmp_grp_cinmelem.vutri                                             <alias name='vutri' />,
                tmp_grp_cinmelem.numeje                                             <alias name='vufina' />,
                tmp_grp_cinmelem.porcen                                             <alias name='pdfina' />,
                tmp_grp_cinmelem.pdtrib                                             <alias name='pdtrib' />,
                tmp_grp_cinmelem.ppe_marca,
                tmp_grp_cinmelem.nommar,
                tmp_grp_cinmelem.ppe_modelo,
                tmp_grp_cinmelem.nommod,
                tmp_grp_cinmelem.ppe_numser,
                tmp_grp_cinmelem.ppe_label_id,
                tmp_grp_cinmelem.seccio,
                tmp_grp_cinmelem.nomsec,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN cpar_parprel.ctainv
                     ELSE tmp_grp_cinmelem.ccinmo
                END                                                         <alias name='crp_cuenta_inmo' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN (SELECT c.nombre
                                                                FROM ccuentas c
                                                               WHERE c.placon = 'PE'
                                                                 AND c.codigo = cpar_parprel.ctainv)
                     ELSE tmp_grp_cinmelem.crp_cuenta_noinmo
                END                                                         <alias name='crp_cuenta_noinmo' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN (SELECT c.ctaori
                                                                FROM crp_chv_mapcta c
                                                               WHERE c.cuenta = cpar_parprel.ctainv)
                     ELSE tmp_grp_cinmelem.ctaori
                END                                                         <alias name='crp_cuenta_chv' />,
                cinmelem.codpre                                             <alias name='crp_inversion' />,
                cpar_parpreh.nompre                                         <alias name='crp_descri_inversion' />,
                cinmelem.codpar                                             <alias name='crp_partida' />,
                cpar_parprel.nompar                                                     <alias name='crp_descri_partida' />,
    
                tmp_grp_cinmelem.nro_contrato_arr          <alias name='nro_contrato_arr'/>,
                tmp_grp_cinmelem.fecha_contrato_arr          <alias name='fecha_contrato_arr'/>,
                tmp_grp_cinmelem.nro_cuotas_arr          <alias name='nro_cuotas_arr'/>,
                tmp_grp_cinmelem.monto_total_arr          <alias name='monto_total_arr'/>,
                CASE WHEN tmp_grp_cinmelem.ccinmo LIKE '33%' AND tmp_grp_cinmelem.ccinmo NOT LIKE '339%' THEN 'Activos fijos'
                     WHEN NVL(cpar_parprel.ctainv, tmp_grp_cinmelem.ccinmo) LIKE '339%' THEN 'Obras en curso'
                     WHEN tmp_grp_cinmelem.ccinmo LIKE '321%' THEN 'Arrendamiento Operativo'
                     WHEN tmp_grp_cinmelem.ccinmo LIKE '322%' THEN 'Arrendamiento Financiero'
                     WHEN tmp_grp_cinmelem.ccinmo LIKE '34%' AND tmp_grp_cinmelem.ccinmo NOT LIKE '349%' THEN 'Intangibles'
                     WHEN NVL(cpar_parprel.ctainv, tmp_grp_cinmelem.ccinmo) LIKE '349%' THEN 'Intangibles en curso'
                END                                                                     <alias name='libro_af'/>,
                (SELECT MAX(capuntes.asient)
                FROM capuntes
                WHERE capuntes.loteid = tmp_grp_cinmelem.loteid)                                <alias name='crp_asiento_axional' />,
                NVL(cinmelem.auxchr2, tmp_grp_cinmelem.nro_asien_ch)                     <alias name='crp_asiento_chavin' />,
                tmp_grp_cinmelem.crp_saldo_inicial <alias name='crp_saldo_inicial' />,
                tmp_grp_cinmelem.crp_imp_adqui <alias name='crp_imp_adqui' />,
                tmp_grp_cinmelem.imp_mejoras <alias name='imp_mejoras'/>,
                tmp_grp_cinmelem.imp_ret_baj <alias name='imp_ret_baj' />,
                tmp_grp_cinmelem.imp_otros_ajus <alias name='imp_otros_ajus' />,
                tmp_grp_cinmelem.imp_dep_acum_ejerc <alias name='imp_dep_acum_ejerc' />,
                tmp_grp_cinmelem.imp_dep_ret_baj <alias name='imp_dep_ret_baj' />,
                0                                                                      <alias name='imp_dep_otr_ajus' />,
                0                                                         <alias name='neto' />,
                ''                                                                      <alias name='cod_quiron' />,
                tmp_grp_cinmelem.auxchr2                                                        <alias name='nro_aut_obra_quiron' />,
                tmp_grp_cinmelem.estado                                                         <alias name='estado' />,
                (SELECT cniveles.nombre
                   FROM cniveles
                  WHERE cniveles.codigo = SUBSTR(tmp_grp_cinmelem.ctaori, 1, 3)
                    AND cniveles.placon = 'PE')                                         <alias name='des_rub_cuenta' />,
                NVL(CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                     ELSE tmp_grp_cinmelem.import
                END, 0)                                                                     <alias name='dep_39' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                     ELSE tmp_grp_cinmelem.import
                END                                                                     <alias name='dep_68' />,
                tmp_grp_cinmelem.deprec_trib_anual <alias name='deprec_trib_anual' />,
                tmp_grp_cinmelem.deprec_trib_acum <alias name='deprec_trib_acum' />,
                tmp_grp_cinmelem.deprec_trib_baja <alias name='deprec_trib_baja' />,
                <!-- Inventariable -->
                CASE WHEN cinmelem.auxchr3 = 1 THEN 'Si'
                     ELSE 'No'
                END                                                                     <alias name='inventariable' />,
                <!-- Grupo Inmovilizado -->
                cinmhead.codgrp                                                         <alias name='grp_inmovilizado' />,
                
                ${mTmpTableCinmamorxMeses}.codigo codigo1,
                ${mTmpTableCinmamorxMeses}.codigo codigo2,
                ${mTmpTableCinmamorxMeses}.codigo codigo3,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado1' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.amortizado
                END                                                                     <alias name='amortizado2' />,
                CASE WHEN cinmelem.codinm LIKE '%9999%' THEN 0
                     ELSE ${mTmpTableCinmamorxMeses}.depre_trib
                END                                                                     <alias name='amortizado3' />

            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>

                    <join type='left' table='${mTmpGrpCinmelem}' alias='tmp_grp_cinmelem'>
                        <on>cinmelem.empcode = tmp_grp_cinmelem.empcode</on>
                        <on>cinmelem.codinm = tmp_grp_cinmelem.codinm</on>
                        <on>cinmelem.codele = tmp_grp_cinmelem.codele</on>
                    </join>
                    

                    <join type='left' table='${mTmpTableCinmamorxMeses}'>
                        <on>cinmelem.empcode = ${mTmpTableCinmamorxMeses}.empcode</on>
                        <on>cinmelem.codinm = ${mTmpTableCinmamorxMeses}.codinm</on>
                        <on>cinmelem.codele = ${mTmpTableCinmamorxMeses}.codele</on>
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
        'crp_elemento',
        'crp_description_elemento',
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
        'codcom',
        'nomcom',
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
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR
    ]);
});

for (let mRowPivot of mRsPivot) {
    mRowPivot.neto = (mRowPivot.crp_saldo_inicial + mRowPivot.crp_imp_adqui + mRowPivot.imp_mejoras + mRowPivot.imp_ret_baj + mRowPivot.imp_otros_ajus)
        - (mRowPivot.imp_dep_acum_ejerc + mRowPivot.dep_39 + mRowPivot.imp_dep_ret_baj + mRowPivot.imp_dep_otr_ajus)
    // console.log(mRowPivot)
    rs.rows().add(mRowPivot);
}

return rs;
