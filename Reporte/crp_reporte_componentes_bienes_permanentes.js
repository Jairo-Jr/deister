function crp_reporte_componente_bienes_permanentes() {

    let mSqlCond = Ax.context.property.COND;

    let mTmpTableFacturaComponente = Ax.db.getTempTableName(`tmp_factura_componente`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableFacturaComponente}`);
    Ax.db.execute(`
            <select intotemp='${mTmpTableFacturaComponente}'>
                <columns>
                    DISTINCT cinmcomp_orig.seqno, gcomfach.depart
                </columns>
                <from table='cinmcomp_orig'>
                    <join table='gcomfacl'>
                        <on>cinmcomp_orig.docid = gcomfacl.linid</on>
                        <join table='gcomfach'>
                            <on>gcomfacl.cabid = gcomfach.cabid</on>
                        </join>
                    </join>
                </from>
            </select>
        `);

    let mTmpTableCinmamorxAnyo = Ax.db.getTempTableName(`tmp_cinmamor_x_anyo`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxAnyo}`);
    Ax.db.execute(`
            <select intotemp='${mTmpTableCinmamorxAnyo}'>
                <columns>
                    cinmcomp.empcode,
                    cinmcomp.codinm,
                    cinmcomp.codele,
                    cinmcomp.codcom,
                    SUM(CASE WHEN cinmamor.fecfin &lt;= '31-12-2022' THEN cinmamor.import
                        ELSE 0
                    END) meinvcom,
                    SUM(CASE WHEN cinmamor.fecfin &gt; '31-12-2022' THEN cinmamor.import
                        ELSE 0
                    END) mainvcom
                </columns>
                <from table='cinmcomp'>
                    <join table='cinmamor'>
                        <on>cinmcomp.empcode = cinmamor.empcode</on>
                        <on>cinmcomp.codinm = cinmamor.codinm</on>
                        <on>cinmcomp.codele = cinmamor.codele</on>
                        <on>cinmcomp.codcom = cinmamor.codcom</on>
                    </join>
                </from>
                <where>
                    cinmamor.estado = 'C'
                </where>
                <group>
                    1, 2, 3, 4
                </group>
            </select>
        `);


    let mTmpTableCinmamorxMeses = Ax.db.getTempTableName(`tmp_cinmamor_x_meses`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmamorxMeses}`);
    Ax.db.execute(`
            <select intotemp='${mTmpTableCinmamorxMeses}'>
                <columns>
                    cinmamor.empcode,
                    cinmamor.codinm,
                    cinmamor.codele,
                    cinmamor.codcom,
                    cperiodo.ejerci,
                    cperiodo.codigo,
                    cperiodo.nomper,
                    SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.import
                            ELSE 0
                        END)                                                    <alias name='amortizado' />,
                    SUM(CASE WHEN cinmamor.estado = 'N' THEN cinmamor.import
                            ELSE 0
                        END)                                                    <alias name='pendiente' />,
                    SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.impmax
                            ELSE 0
                        END)                                                    <alias name='depre_trib' />
                </columns>
                <from table='cinmamor'>
                    <join table='cperiodo'>
                        <on>cinmamor.empcode = cperiodo.empcode</on>
                        <on>cinmamor.fecfin BETWEEN cperiodo.fecini AND cperiodo.fecfin</on>
                        <on>cperiodo.ejerci = 2023</on>
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

    let mRsReporteComponentes = Ax.db.executeQuery(`
            <select>
                <columns>
                    cinmcomp.codcom,
                    cinmcomp.nomcom,
                    cinmcomp.auxchr1,
                    cinmcomp.unidad,
                    cinmcomp.codcta,
                    cinmctas.descri,
                    cinmctas.ccamor,
                    ccuentas2.nombre                                            <alias name='noamor' />, 
                    crp_chv_mapcta1.ctaori,
                    cinmctas.ccdota,
                    ccuentas3.nombre                                            <alias name='nodota' />,
                    cinmcomp.locpri,
                    cinmlopr.nomloc,
                    cinmcomp.locsub,
                    cinmlosu.nomlug,
                    cinmelem_ppe.ppe_codres,
                    cper_empleado.nomemp||' '|| cper_empleado.apeemp nomres,
                    ${mTmpTableFacturaComponente}.depart,
                    gdeparta.nomdep,
                    cinmcomp.codinm,
                    cinmhead.nominm,
                    YEAR(cinmcomp.fecha) || LPAD(MONTH(cinmcomp.fecha), 2, '0') <alias name='fecha' />,
                    cinmcomp.fecbaj,
                    cinmcomp.motivo, 
                    cinmcomp.tercer,
                    ctercero.nombre,
                    ctercero.cif,
                    cinmcomp.jusser,
                    cinmcomp.docser,
                    cinmcomp.fecfac,
                    cinmcomp.numfac,
                    cinmcomp.fecini,  
                    cinmftab.numeje                                             <alias name='vufina' />,
                    cinmcval.numeje                                             <alias name='vutri' />,
                    cinmftab.porcen                                             <alias name='pdfina' />,
                    cinmcval.porcen                                             <alias name='pdtrib' />,        
                    cinmelem_ppe.ppe_marca,
                    cinmelem_ppe.ppe_modelo,
                    cinmelem_ppe.ppe_numser,
                    cinmelem_ppe.ppe_label_id,
                    cinmctas.ccinmo,
                    ccuentas1.nombre                                            <alias name='noinmo' />,
                    cinmelem.codpre,
                    cpar_parpreh.nompre,
                    ''                                                          <alias name='Nro_Contrato_Arr'/>,
                    ''                                                          <alias name='Fecha_Contrato_Arr'/>,
                    ''                                                          <alias name='Nro_Cuotas_Arr'/>,
                    ''                                                          <alias name='Monto_Total_Arr'/>,
                    ''                                                          <alias name='Libro_AF'/>,
                    ${mTmpTableCinmamorxAnyo}.meinvcom,
                    ${mTmpTableCinmamorxAnyo}.mainvcom,
                    cinmcval.acucom,
                    cinmcomp.codgru,
                    cinmfgrp.nomgru,
                    cinmcomp.codfis,
                    cinmftab.nomfis,    
                    cinmcomp.fecha,
                    cinmcomp.numser,
                    crp_chv_mapcta1.ctaori                                      <alias name='cinmoch'/>,
                    crp_chv_mapcta2.ctaori                                      <alias name='camorch'/>,     
                    crp_chv_mapcta3.ctaori                                      <alias name='cdotach'/>,
                    CASE WHEN cinmcomp.tipcom = 'M' THEN cinmcval.invcom
                        ELSE 0
                        END                                                    <alias name='Imp_Mejoras'/>,
                    CASE WHEN cinmcomp.tipcom = 'B' THEN cinmcval.invcom
                        ELSE 0   
                    END                                                         <alias name='Imp_Ret_Baj'/>,
                    CASE WHEN cinmcomp.tipcom = 'J' THEN cinmcval.invcom
                        ELSE 0
                    END                                                         <alias name='Imp_Otros_Ajus'/>,
                    cinmcval.netcom,
                    cinmhead.estcom,
                    ${mTmpTableCinmamorxMeses}.codigo,
                    ${mTmpTableCinmamorxMeses}.codigo codigo1,
                    ${mTmpTableCinmamorxMeses}.codigo codigo2,
                    ${mTmpTableCinmamorxMeses}.amortizado,
                    ${mTmpTableCinmamorxMeses}.pendiente,
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
                            <join type='left' table='cinmlopr'>
                                <on>cinmcomp.locpri = cinmlopr.codigo</on>
                            </join>
                            <join type='left' table='cinmlosu'>
                                <on>cinmcomp.locsub = cinmlosu.codigo</on>
                            </join>
                            <join type="left" table="cinmelem_ppe">
                                <on>cinmcomp.seqno = cinmelem_ppe.ppe_seqno_compon</on>
                                <join type='left' table='cper_empleado'>
                                    <on>cinmelem_ppe.ppe_codres = cper_empleado.codigo</on>
                                </join>
                            </join>
                            <join type='left' table='${mTmpTableFacturaComponente}'>
                                <on>cinmcomp.seqno = ${mTmpTableFacturaComponente}.seqno</on>
                                <join type='left' table='gdeparta'>
                                    <on>${mTmpTableFacturaComponente}.depart = gdeparta.depart</on>
                                </join>
                            </join>
                            <join type='left' table='${mTmpTableCinmamorxAnyo}'>
                                <on>cinmcomp.empcode = ${mTmpTableCinmamorxAnyo}.empcode</on>
                                <on>cinmcomp.codinm = ${mTmpTableCinmamorxAnyo}.codinm</on>
                                <on>cinmcomp.codele = ${mTmpTableCinmamorxAnyo}.codele</on>
                                <on>cinmcomp.codcom = ${mTmpTableCinmamorxAnyo}.codcom</on>
                            </join>
                            <join type='left' table='${mTmpTableCinmamorxMeses}'>
                                <on>cinmcomp.empcode = ${mTmpTableCinmamorxMeses}.empcode</on>
                                <on>cinmcomp.codinm = ${mTmpTableCinmamorxMeses}.codinm</on>
                                <on>cinmcomp.codele = ${mTmpTableCinmamorxMeses}.codele</on>
                                <on>cinmcomp.codcom = ${mTmpTableCinmamorxMeses}.codcom</on>
                            </join>
                        </join>
                        <join type='left' table='cpar_parpreh'>
                            <on>cinmelem.codpre = cpar_parpreh.codpre</on>
                        </join>
                        <join type='left' table='cseccion'>
                            <on>cinmelem.seccio  = cseccion.codigo</on>
                        </join>
                    </join>
                </from>
                <where>
                    ${mSqlCond}
                </where>
                <order>
                    1, 67
                </order>
            </select>
        `);

    let mRsPivot = mRsReporteComponentes.pivot(options => {
        options.setPivotColumnNames(['codigo', 'codigo1', 'codigo2']);
        options.setMeasureColumnNames(['amortizado', 'pendiente', 'depre_trib']);
    });

    console.log(mRsPivot);

    let rs = new Ax.rs.Reader().memory(options => {
        options.setColumnNames([
            'codcom', 'nomcom', 'auxchr1', 'unidad', 'codcta', 'descri',
            'ccamor', 'noamor', 'ctaori', 'ccdota', 'nodota', 'locpri',
            'nomloc', 'locsub', 'nomlug', 'ppe_codres', 'nomres', 'depart',
            'nomdep', 'codinm', 'nominm', 'fecha', 'fecbaj', 'motivo',
            'tercer', 'nombre', 'cif', 'jusser', 'docser', 'fecfac',
            'numfac', 'fecini', 'vufina', 'vutri', 'pdfina', 'pdtrib',
            'ppe_marca', 'ppe_modelo', 'ppe_numser', 'ppe_label_id', 'ccinmo', 'noinmo',
            'codpre', 'nompre', 'nro_contrato_arr', 'fecha_contrato_arr', 'nro_cuotas_arr', 'monto_total_arr',
            'libro_af', 'meinvcom', 'mainvcom', 'acucom', 'codgru', 'nomgru',
            'codfis', 'nomfis', 'fecha', 'numser', 'cinmoch', 'camorch',
            'cdotach', 'imp_mejoras', 'imp_ret_baj', 'imp_otros_ajus', 'netcom', 'estcom',
            'c1', 'c13', 'c25', 'c2', 'c14', 'c26',
            'c3', 'c15', 'c27', 'c4', 'c16', 'c28',
            'c5', 'c17', 'c29', 'c6', 'c18', 'c30',
            'c7', 'c19', 'c31', 'c8', 'c20', 'c32',
            'c9', 'c21', 'c33', 'c10', 'c22', 'c34',
            'c11', 'c23', 'c35', 'c12', 'c24', 'c36', 'c37', 'c38', 'c39'
        ]);
        options.setColumnTypes([
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.INTEGER, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.DATE, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.DATE,
            Ax.sql.Types.CHAR, Ax.sql.Types.DATE, Ax.sql.Types.INTEGER, Ax.sql.Types.INTEGER, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.DATE, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.CHAR,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE
        ]);
    });

    for (let mRowPivot of mRsPivot) {
        rs.rows().add(mRowPivot);
    }

    return rs;

}