function crp_reporte_componente_bienes_permanentes__v2() {

    let mSqlCond = Ax.context.property.COND;

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

                SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.import
                        ELSE 0
                    END)                                                    <alias name='amortizado' />,
                SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.impmax
                        ELSE 0
                    END)                                                    <alias name='depre_trib' />
            </columns>
            <from table='cinmcomp'>
                <join type='left' table='cinmamor'>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                    <join table='cperiodo'>
                        <on>cinmamor.empcode = cperiodo.empcode</on>
                        <on>cinmamor.fecfin BETWEEN cperiodo.fecini AND cperiodo.fecfin</on>
                        <on>cperiodo.ejerci = YEAR(TODAY)</on>
                    </join>
                </join>
            </from>
            <group>
                1, 2, 3, 4, 5, 6, 7
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
                cinmcomp.empcode,
                cinmcomp.codinm,
                cinmcomp.codele,
                cinmcomp.codcom,
                SUM(cinmamor.import) <alias name='import' />
            </columns>
            <from table='cinmcomp'>
                <join table='cinmamor'>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                    <on>cinmamor.fecfin BETWEEN MDY(1,1,YEAR(TODAY)) AND MDY(12,31,YEAR(TODAY))</on>
                    <on>cinmamor.estado = 'C'</on>
                </join>
            </from>
            <group>
                1, 2, 3, 4
            </group>
            <order>
                4
            </order>
        </select>
    `);

    let mTmpTable = Ax.db.getTempTableName(`tmp_opening_balance`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);
    Ax.db.execute(`
        SELECT FIRST 1 *
          FROM (SELECT gcomfach.docser, 
                    -- gcomsolh.depart depart_sol  2023 03 28 CBF por instruccion de MRA
                       NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol
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
                 NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol
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

    let rsComponentes = Ax.db.executeQuery(`
        <select>
            <columns>
                cinmcomp.codcom,
                cinmcomp.nomcom,
                cinmcomp.auxchr1,
                'UND'                                                       <alias name='crp_medida' />,
                cinmcomp.codinm                                             <alias name='crp_grupo_bien' />,
                cinmctas.descri                                             <alias name='crp_descripcion_bien' />,
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
                YEAR(cinmcomp.fecha) || LPAD(MONTH(cinmcomp.fecha), 2, '0') <alias name='crp_periodo' />,
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
                cinmftab.numeje                                             <alias name='vufina' />,
                cinmcval.numeje                                             <alias name='vutri' />,
                cinmftab.porcen                                             <alias name='pdfina' />,
                cinmcval.porcen                                             <alias name='pdtrib' />,
                cinmelem_ppe.ppe_marca,
                gartmarc.nommar,
                cinmelem_ppe.ppe_modelo,
                gartmode.nommod,
                cinmelem_ppe.ppe_numser,
                cinmelem_ppe.ppe_label_id,
                gdeparta.seccio,
                cseccion.nomsec,
                cinmctas.ccinmo                                             <alias name='crp_cuenta_inmo' />,
                ccuentas1.nombre                                            <alias name='crp_cuenta_noinmo' />,
                crp_chv_mapcta1.ctaori                                      <alias name='crp_cuenta_chv' />,
                cinmelem.codpre                                             <alias name='crp_inversion' />,
                cpar_parpreh.nompre                                         <alias name='crp_descri_inversion' />,
                cinmelem.codpar                                             <alias name='crp_partida' />,
                cpar_parprel.nompar                                                     <alias name='crp_descri_partida' />,
    
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.docser END          <alias name='Nro_Contrato_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcomp.fecfac END          <alias name='Fecha_Contrato_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmftab.numeje END          <alias name='Nro_Cuotas_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '322%' THEN cinmcval.invcom END          <alias name='Monto_Total_Arr'/>,
                CASE WHEN cinmctas.ccinmo LIKE '33%' AND cinmctas.ccinmo NOT LIKE '339%' THEN 'Activos fijos'
                    WHEN cinmctas.ccinmo LIKE '339%' THEN 'Obras en curso'
                    WHEN cinmctas.ccinmo LIKE '321%' THEN 'Arrendamiento Operativo'
                    WHEN cinmctas.ccinmo LIKE '322%' THEN 'Arrendamiento Financiero'
                    WHEN cinmctas.ccinmo LIKE '34%' AND cinmctas.ccinmo NOT LIKE '349%' THEN 'Intangibles'
                    WHEN cinmctas.ccinmo LIKE '349%' THEN 'Intangibles en curso'
                END <alias name='Libro_AF'/>,
                (SELECT MAX(capuntes.asient)
                FROM capuntes
                WHERE capuntes.loteid = gcomfach.loteid)                                <alias name='crp_asiento_axional' />,
                crp_chv_xdocpro.loteid                                                  <alias name='crp_asiento_chavin' />,
                CASE WHEN YEAR(cinmcomp.fecbaj) = YEAR(TODAY) AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                     WHEN YEAR(cinmcomp.fecha) &lt; YEAR(TODAY) THEN cinmcval.invcom
                     END                                                                <alias name='crp_saldo_inicial' />, 
                CASE WHEN YEAR(cinmcomp.fecha) = YEAR(TODAY)
                        AND cinmcomp.tipcom != 'J'
                        AND cinmcomp.docser NOT LIKE 'FINV%' THEN cinmcval.invcom
                    END                                                                 <alias name='crp_imp_adqui' />,
                CASE WHEN cinmcomp.tipcom = 'M' THEN cinmcval.invcom
                    ELSE 0
                    END                                                                 <alias name='Imp_Mejoras'/>,
                CASE WHEN cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END                                                                     <alias name='Imp_Ret_Baj' />,
                CASE WHEN cinmcomp.tipcom = 'J' THEN cinmcval.invcom
                     WHEN cinmcomp.docser LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0   
                END                                                                     <alias name='Imp_Otros_Ajus' />,
                cinmcval.inicom                                                         <alias name='imp_dep_acum_ejerc' />,
                CASE WHEN cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END                                                                     <alias name='imp_dep_ret_baj' />,
                ''                                                                      <alias name='imp_dep_otr_ajus' />,
                cinmcval.netcom                                                         <alias name='neto' />,
                ''                                                                      <alias name='cod_quiron' />,
                cinmcomp.auxchr2                                                        <alias name='nro_aut_obra_quiron' />,
                cinmcval.estado                                                         <alias name='estado' />,
                (SELECT cniveles.nombre
                   FROM cniveles
                  WHERE cniveles.codigo = SUBSTR(crp_chv_mapcta1.ctaori, 1, 3)
                    AND cniveles.placon = 'PE')                             <alias name='des_rub_cuenta' />,
                ${mTmpTableCinmamorxConta}.import <alias name='dep_39' />,
                ${mTmpTableCinmamorxConta}.import <alias name='dep_68' />,
                ${mTmpTableCinmamorxMeses}.codigo,
                ${mTmpTableCinmamorxMeses}.codigo codigo1,
                ${mTmpTableCinmamorxMeses}.codigo codigo2,
                ${mTmpTableCinmamorxMeses}.amortizado,
                ${mTmpTableCinmamorxMeses}.amortizado amortizado2,
                ${mTmpTableCinmamorxMeses}.depre_trib
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
                ${mSqlCond}
            </where>
            <order>
                1, 78
            </order>
        </select>
    `);

    let mRsPivot = rsComponentes.pivot(options => {
        options.setPivotColumnNames(['codigo', 'codigo1', 'codigo2']);
        options.setMeasureColumnNames(['amortizado', 'amortizado2', 'depre_trib']);
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
            'c39'
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
            Ax.sql.Types.INTEGER,
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
            Ax.sql.Types.DOUBLE
        ]);
    });

    for (let mRowPivot of mRsPivot) {
        rs.rows().add(mRowPivot);
    }

    return rs;

}