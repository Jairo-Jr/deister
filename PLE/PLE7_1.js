function PLE7_1() {
    /**
     * Name: pe_sunat_ple07_1_rep
     */

        // ===============================================================
        // Tipo de reporte y año del periodo informado
        // ===============================================================
    var pStrCondicion   = Ax.context.variable.TIPO;
    var mIntYear        = Ax.context.variable.YEAR;

    // ===============================================================
    // Definición del valor de tipo de cambio
    // de la moneda extranjera al finalizar el periodo
    // ===============================================================
    var mCambioUSD = 0.00;
    var mCambioEUR = 0.00;

    var mArrayTipCambio = Ax.db.executeQuery(`
        <select>
            <columns>
                ccambios.moneda,
                ccambios.cambio
            </columns>
            <from table='ccambios'/>
            <where>
                tipcam = 'D'
                AND monori = 'PEN'
                AND fecha = '31-12-${mIntYear}'
            </where>
        </select>
    `).toJSONArray();

    mArrayTipCambio.forEach(mObjTipCambio => {

        if (mObjTipCambio.moneda == 'USD') {
            mCambioUSD = mObjTipCambio.cambio;
        }
        if (mObjTipCambio.moneda == 'EUR') {
            mCambioEUR = mObjTipCambio.cambio;
        }
    });

    // ===============================================================
    // TABLA TEMPORAL PARA ACTIVOS FIJOS
    // ===============================================================
    let mTmpTableActivos = Ax.db.getTempTableName(`tmp_cinmelem_activos_fijos`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableActivos}`);

    Ax.db.execute(`
        <select intotemp='${mTmpTableActivos}'>
            <columns>
                cinmelem.codinm,
                cinmelem.codele,
                cperiodo.ejerci,
                cperiodo.codigo,
                cperiodo.nomper,
                MAX(cinmcomp.loteid) loteid,
                SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.impmax END) <alias name='impmax' />
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join table='cinmcomp'>
                        <on>cinmelem.empcode = cinmcomp.empcode</on>
                        <on>cinmelem.codinm = cinmcomp.codinm</on>
                        <on>cinmelem.codele = cinmcomp.codele</on>
                        <join table='cinmamor'>
                            <on>cinmcomp.empcode = cinmamor.empcode</on>
                            <on>cinmcomp.codinm = cinmamor.codinm</on>
                            <on>cinmcomp.codele = cinmamor.codele</on>
                            <on>cinmcomp.codcom = cinmamor.codcom</on>
                            <join table='cperiodo'>
                                <on>cinmamor.empcode = cperiodo.empcode</on>
                                <on>cinmamor.fecfin BETWEEN cperiodo.fecini AND cperiodo.fecfin</on>
                                <on>cinmamor.estado = 'C'</on>
                                <on>cperiodo.ejerci IN (YEAR(TODAY), YEAR(TODAY)-1)</on>
                            </join>
                        </join>
                    </join>
                </join>
            </from>
            <group>
                1, 2, 3, 4, 5
            </group>
            <order>
                3, 2, 4
            </order>
        </select>
    `);

    // ===============================================================
    // RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.3
    // ===============================================================
    var mRsPle7_3 = Ax.db.executeQuery(` 
        <select>
            <columns>
                YEAR(TODAY) || '0000'   <alias name='periodo' />,
                'M' || crp_asiento_activofijo.nro_asien_ch  <alias name='cuo' />,
                crp_asiento_activofijo.nro_asien_ch ||'.'|| crp_asiento_activofijo.seqno<alias name='corr_asiento' />,
                '9'  <alias name='cod_catalogo' />,
                cinmelem.auxchr1  <alias name='cod_activo' />,
                ''  <alias name='codigo_del_catalogo_utilizado' />,
                ''  <alias name='cod_existencia' />,
                '1'  <alias name='tipo_activo' />,
                ''  <alias name='cta_contable' />,
                ''  <alias name='estado_act' />,
                cinmelem.nomele  <alias name='descripcion_activo' />,
                gartmarc.nommar  <alias name='marca' />,
                gartmode.nommod  <alias name='modelo' />,
                cinmelem_ppe.ppe_numser  <alias name='nro_serie' />,
                CASE WHEN ${mTmpTableActivos}.ejerci &gt; YEAR(TODAY) THEN ${mTmpTableActivos}.impmax ELSE 0 END  <alias name='imp_saldo_inicial' />,
                0  <alias name='imp_adq_y_adic' />,
                0  <alias name='imp_mejoras' />,
                0  <alias name='imp_bajas' />,
                0  <alias name='imp_ajustes' />,
                0  <alias name='imp_revaluac_volunt' />,
                0  <alias name='imp_revaluac_reorg' />,
                0  <alias name='imp_revaluac_otras' />,
                0  <alias name='imp_ajuste_inflac' />,
                ''  <alias name='fecha_adq' />,
                ''  <alias name='fecha_uso' />,
                '1'  <alias name='metodo_calc' />,
                '00000'  <alias name='nro_autoriz_camb_calc' />,
                ''  <alias name='porc_deprec' />,
                ''  <alias name='imp_depre_acumulada' />,
                CASE WHEN ${mTmpTableActivos}.ejerci = YEAR(TODAY) THEN ${mTmpTableActivos}.impmax ELSE 0 END <alias name='imp_depre_sin_revaluac' />,
                0  <alias name='imp_depre_bajas' />,
                0  <alias name='imp_depre_ajustes' />,
                0  <alias name='imp_depre_revaluac_volunt' />,
                0  <alias name='imp_depre_revaluac_reorg' />,
                0  <alias name='imp_depre_revaluac_otras' />,
                0  <alias name='imp_depre_ajuste_inflac' />,
                '1'  <alias name='estado_ope' />
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join type='left' table='${mTmpTableActivos}'>
                        <on>cinmelem.codinm = ${mTmpTableActivos}.codinm</on>
                        <on>cinmelem.codele = ${mTmpTableActivos}.codele</on>
                        <join type='left' table='crp_asiento_activofijo'>
                            <on>${mTmpTableActivos}.loteid = crp_asiento_activofijo.ref</on>
                        </join>
                    </join>
                    <join type='left' table='cinmelem_ppe'>
                        <on>cinmelem.seqno = cinmelem_ppe.ppe_seqno_compon</on>
                        <join type='left' table='gartmarc'>
                            <on>cinmelem_ppe.ppe_marca = gartmarc.codigo</on>
                            <join type='left' table='gartmode'>
                                <on>gartmarc.codigo = gartmode.marca</on>
                                <on>cinmelem_ppe.ppe_modelo = gartmode.modelo</on>
                            </join>
                        </join>
                    </join>
                </join>
            </from>
        </select>
    `);
    // ===============================================================
    // Variables del nombre del archivo
    // ===============================================================
    var mStrRuc             = '20100121809';
    var mStrYear            = mIntYear;
    var mIntIndOperacion    = 1;
    var mIntContLibro       = 1;
    var mIntMoneda          = 1;

    // ===============================================================
    // Estructura de nombre del archivo txt de salida:
    // LERRRRRRRRRRRAAAA000007030000OIM1.txt
    // ===============================================================
    var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

    // ===============================================================
    // Si la condición del reporte es Fichero (F)
    // ===============================================================
    if (pStrCondicion == 'F') {

        // ===============================================================
        // Definición del blob
        // ===============================================================
        var blob = new Ax.sql.Blob(mStrNameFile);

        // ===============================================================
        // Definición del archivo txt
        // ===============================================================
        new Ax.rs.Writer(mRsPle7_3).csv(options => {
            options.setHeader(false);
            options.setDelimiter("|");
            options.setResource(blob);
        });

        // ===============================================================
        // Definición de file zip
        // ===============================================================
        var ficherozip  = new Ax.io.File("/tmp/ziptest.zip");
        var zip         = new Ax.util.zip.Zip(ficherozip);

        zip.zipFile(blob);
        zip.close();

        // ===============================================================
        // Definición blob del archivo zip
        // ===============================================================
        var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
        var fichero = new Ax.sql.Blob(dst);

        // ===============================================================
        // Definición ResultSet temporal
        // ===============================================================
        var mRsFile = new Ax.rs.Reader().memory(options => {
            options.setColumnNames(["name", "archivo"]);
            options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
        });
        mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

        return mRsFile;

        // ===============================================================
        // Si la condición del reporte es Informe (I)
        // ===============================================================
    } else if (pStrCondicion == 'I') {
        return mRsPle7_3;
    }
}