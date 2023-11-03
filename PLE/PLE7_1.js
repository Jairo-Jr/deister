function PLE7_1() {
    /**
     * Name: pe_sunat_ple07_1_rep
     */

        // ===============================================================
        // Tipo de reporte y año del periodo informado
        // ===============================================================
    var pStrCondicion   = 'I';
    var mIntYear        = 2023;

    // ===============================================================
    // DEFINICIÓN DE CAMPOS PERSONALIZADOS
    // ===============================================================
    var mStrColumn = pStrCondicion == 'F' ? '' : `codele,`;

    // ===============================================================
    // TABLA TEMPORAL PARA ACTIVOS FIJOS
    // ===============================================================
    let mTmpTableActivos = Ax.db.getTempTableName(`tmp_cinmelem_activos_fijos`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableActivos}`);

    Ax.db.execute(`
        <union type='all' intotemp='${mTmpTableActivos}'>
            <select>
                <columns>
                    cinmelem.codinm,
                    cinmelem.codele,
                    cperiodo.ejerci,
                    cperiodo.codigo,
                    cperiodo.nomper,
                    MAX(cinmcomp.loteid) loteid,
                    SUM(CASE WHEN cinmamor.estado = 'C' THEN cinmamor.impmax END) <alias name='impmax' />,
                    SUM(CASE WHEN cinmamor.estado = 'C' AND cinmcomp.tipcom = 'B' THEN cinmamor.impmax ELSE 0 END) <alias name='imp_depre_bajas' />,
                    SUM(CASE WHEN cinmamor.estado = 'C' AND cinmcomp.tipcom = 'J' THEN cinmamor.impmax ELSE 0 END) <alias name='imp_depre_ajustes' />,
                    0 <alias name='imp_saldo_inicial' />
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
            </select>
    
            <select>
                <columns>
                    cinmelem.codinm,
                    cinmelem.codele,
                    2023 ejerci,
                    14 codigo,
                    'saldo_inicial' nomper,
                    0 loteid,
                    0 <alias name='impmax' />,
                    0 <alias name='imp_depre_bajas' />,
                    0 <alias name='imp_depre_ajustes' />,
    
                    SUM(CASE WHEN YEAR(cinmcomp.fecbaj) = YEAR(TODAY) AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                    WHEN YEAR(cinmcomp.fecha) &lt; YEAR(TODAY) THEN cinmcval.invcom
                    END)                                                                    <alias name='imp_saldo_inicial' />
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
                    </join>
                </from>
                <group>
                    1, 2
                </group>
            </select>
        </union>
    `);


    // ===============================================================
    // TABLA TEMPORAL PARA VALORES DE COMPONENTE
    // ===============================================================
    let mTmpTableCinmcval = Ax.db.getTempTableName(`tmp_cinmelem_cinmcval`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmcval}`);

    Ax.db.execute(`
        <select intotemp='${mTmpTableCinmcval}'>
            <columns>
                cinmelem.seqno,
                SUM(CASE WHEN YEAR(cinmcomp.fecbaj) = YEAR(TODAY) AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                        WHEN YEAR(cinmcomp.fecha) &lt; YEAR(TODAY) THEN cinmcval.invcom
                END)                                                                    <alias name='imp_saldo_inicial' />,
                SUM(CASE WHEN YEAR(cinmcomp.fecha) = YEAR(TODAY)
                        AND cinmcomp.tipcom != 'J'
                        AND cinmcomp.docser NOT LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0
                END)                                                                    <alias name='imp_adq_y_adic' />,
        
                SUM(CASE WHEN cinmcomp.tipcom = 'M' THEN cinmcval.invcom
                    ELSE 0
                    END)                                                                <alias name='imp_mejoras'/>,
                SUM(CASE WHEN cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END)                                                                     <alias name='imp_ret_baj' />,
                SUM(CASE WHEN cinmcomp.tipcom = 'J' THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0   
                END)                                                                     <alias name='imp_otros_ajus' />,
                MIN(cinmcomp.fecfac) <alias name='fecha_adq' />,
                MIN(NVL(cinmcomp.auxnum3, cinmcomp.fecini)) <alias name='fecha_uso' />,
                MIN(cinmftab.porcen) <alias name='porc_deprec' />,
                MIN(cinmcomp.fecha) <alias name='fec_contab' />
                
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
                        <join type='left' table='cinmftab'>
                            <on>cinmcomp.codfis = cinmftab.codigo</on>
                        </join>
                    </join>
            </from>
            <group>
                1
            </group>
        </select>
    `);



    // ===============================================================
    // TABLA TEMPORAL DE ELEMENTOS
    // ===============================================================
    let mTmpTableCinmelem = Ax.db.getTempTableName(`tmp_cinmelem_ple`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmelem}`);

    Ax.db.execute(`
        <select intotemp='${mTmpTableCinmelem}'>
            <columns>
                ${mIntYear} || '0000'                                                       <alias name='periodo' />,
                NVL(CASE WHEN tmp_cinmcval.fec_contab &lt; '01-01-${mIntYear}' THEN '00000000.'
                     ELSE cinmelem.auxchr2
                END, '')                                                                         <alias name='cuo' />,
                                                                            
                'A-M-C'    <alias name='corr_asiento' />,

                '9'                                                                         <alias name='cod_catalogo' />,
                cinmelem_ppe.ppe_label_id  <alias name='cod_activo' />,
                cinmhead.auxchr1                                                            <alias name='codigo_del_catalogo_utilizado' />,
                ''                                                                          <alias name='cod_existencia' />,
                '1'                                                                         <alias name='tipo_activo' />,
                'crp_chv_mapcta.ctaori'                                                     <alias name='cta_contable' />,
                '9'                                                                         <alias name='estado_act' />,
                cinmelem.nomele  <alias name='descripcion_activo' />,
                gartmarc.nommar  <alias name='marca' />,
                gartmode.nommod  <alias name='modelo' />,
                cinmelem_ppe.ppe_numser  <alias name='nro_serie' />,
                CASE WHEN tmp_activos_fijos.codigo = 14 THEN tmp_activos_fijos.imp_saldo_inicial ELSE 0 END              <alias name='imp_saldo_inicial' />,
                tmp_cinmcval.imp_adq_y_adic                 <alias name='imp_adq_y_adic' />,
                tmp_cinmcval.imp_mejoras                    <alias name='imp_mejoras' />,
                tmp_cinmcval.imp_ret_baj                    <alias name='imp_bajas' />,
                tmp_cinmcval.imp_otros_ajus                 <alias name='imp_ajustes' />,
                0  <alias name='imp_revaluac_volunt' />,
                0  <alias name='imp_revaluac_reorg' />,
                0  <alias name='imp_revaluac_otras' />,
                0  <alias name='imp_ajuste_inflac' />,
                tmp_cinmcval.fecha_adq                      <alias name='fecha_adq' />,
                tmp_cinmcval.fecha_uso                      <alias name='fecha_uso' />,
                '1'  <alias name='metodo_calc' />,
                '00000'  <alias name='nro_autoriz_camb_calc' />,
                tmp_cinmcval.porc_deprec                    <alias name='porc_deprec' />,
                CASE WHEN tmp_activos_fijos.ejerci = YEAR(TODAY)-1 THEN tmp_activos_fijos.impmax ELSE 0 END  <alias name='imp_depre_acumulada' />,
                CASE WHEN tmp_activos_fijos.ejerci = YEAR(TODAY) THEN tmp_activos_fijos.impmax ELSE 0 END <alias name='imp_depre_sin_revaluac' />,
                tmp_activos_fijos.imp_depre_bajas  <alias name='imp_depre_bajas' />,
                tmp_activos_fijos.imp_depre_ajustes  <alias name='imp_depre_ajustes' />,
                0  <alias name='imp_depre_revaluac_volunt' />,
                0  <alias name='imp_depre_revaluac_reorg' />,
                0  <alias name='imp_depre_revaluac_otras' />,
                0  <alias name='imp_depre_ajuste_inflac' />,
                '1'  <alias name='estado_ope' />,
                
                cinmelem.codele,
                cinmelem.empcode,
                cinmelem.codcta,
                tmp_activos_fijos.codigo
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join type='left' table='${mTmpTableActivos}' alias='tmp_activos_fijos'>
                        <on>cinmelem.codinm = tmp_activos_fijos.codinm</on>
                        <on>cinmelem.codele = tmp_activos_fijos.codele</on>
                        <join type='left' table='crp_asiento_activofijo'>
                            <on>tmp_activos_fijos.loteid = crp_asiento_activofijo.ref</on>
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
        
                    <join type='left' table='${mTmpTableCinmcval}' alias='tmp_cinmcval'>
                        <on>cinmelem.seqno = tmp_cinmcval.seqno</on>
                    </join>

                </join>
            </from>
            <where>
                tmp_activos_fijos.ejerci &gt;= ${mIntYear} - 1
    
                AND cinmelem.codele IN ('125006810', '125005146', '125005568', '125005147')
                <!-- cinmelem.codele = '125006810' -->
                <!-- 125005568 -->
            </where>
        </select>
    `);

    /**
     * RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.1
     */
    var mStringPle7_1 = Ax.db.executeQuery(` 
        <select>
            <columns>
                periodo,
                cuo,                                                     
                corr_asiento,
                cod_catalogo,
                cod_activo,
                codigo_del_catalogo_utilizado,
                cod_existencia,
                tipo_activo,
                CASE WHEN imp_saldo_inicial != 0 AND imp_adq_y_adic != 0 AND imp_mejoras != 0 AND imp_bajas != 0 AND imp_ajustes != 0 THEN crp_chv_mapcta1.ctaori
                     WHEN imp_depre_acumulada != 0 AND imp_depre_sin_revaluac != 0 AND imp_depre_bajas != 0 AND imp_depre_ajustes != 0 THEN crp_chv_mapcta2.ctaori
                     ELSE '0'
                END cta_contable,
                estado_act,
                descripcion_activo,
                marca,
                modelo,
                nro_serie,
                imp_saldo_inicial,
                imp_adq_y_adic,
                imp_mejoras,
                imp_bajas,
                imp_ajustes,
                imp_revaluac_volunt,
                imp_revaluac_reorg,
                imp_revaluac_otras,
                imp_ajuste_inflac,
                fecha_adq,
                fecha_uso,
                metodo_calc,
                nro_autoriz_camb_calc,
                porc_deprec,
                imp_depre_acumulada,
                imp_depre_sin_revaluac,
                imp_depre_bajas,
                imp_depre_ajustes,
                imp_depre_revaluac_volunt,
                imp_depre_revaluac_reorg,
                imp_depre_revaluac_otras,
                imp_depre_ajuste_inflac,
                estado_ope,
                
                ${mStrColumn}
                <whitespace/>
            </columns>
            <from table='${mTmpTableCinmelem}' alias='tmp_cinmelem'>
                <join table='cempresa'>
                    <on>tmp_cinmelem.empcode = cempresa.empcode</on>
                    <on>tmp_cinmelem.codcta  = cinmctas.codigo</on>
                    <join type='left' table='cinmctas'>
                        <on>cempresa.placon  = cinmctas.placon</on>
                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta1'>>
                            <on>cinmctas.ccinmo = crp_chv_mapcta1.cuenta</on>
                        </join>
                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta2'>
                            <on>cinmctas.ccamor = crp_chv_mapcta2.cuenta</on>
                        </join>
                    </join>
                </join>
            </from>
            <order>
                tmp_cinmelem.codele, tmp_cinmelem.codigo
            </order>
        </select>
    `).toJSON();

    var mObjPle7_1 = JSON.parse(mStringPle7_1);
    var mArrayPle7_1 = mObjPle7_1.rowset;

    var i=0;
    var mIntSec = 1;
    mArrayPle7_1.forEach(row => {

        if(row[1] == '00000000.'){
            mArrayPle7_1[i][1] = row[1] + mIntSec;
            mArrayPle7_1[i][2] = 'A' + mArrayPle7_1[i][1].split('.')[0];
            mIntSec++;
        } else {
            mArrayPle7_1[i][2] = 'M' + mArrayPle7_1[i][1].split('.')[0];
        }
        i++;
    });

    mObjPle7_1.rowset = mArrayPle7_1;
    mStringPle7_1 = JSON.stringify(mObjPle7_1)

    // mStringPle7_1 =
    var mRsPLE7_1 = new Ax.rs.Reader().json(options => {
        options.setStringResource(mStringPle7_1);
    });


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
    // LERRRRRRRRRRRAAAA000007010000OIM1.TXT
    // ===============================================================
    var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007010000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

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
        new Ax.rs.Writer(mRsPLE7_1).csv(options => {
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
        return mRsPLE7_1;
    }
                END)                                                                    <alias name='imp_adq_y_adic' />,
        
                SUM(CASE WHEN cinmcomp.tipcom = 'M' THEN cinmcval.invcom
                    ELSE 0
                    END)                                                                <alias name='imp_mejoras'/>,
                SUM(CASE WHEN cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END)                                                                     <alias name='imp_ret_baj' />,
                SUM(CASE WHEN cinmcomp.tipcom = 'J' THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0   
                END)                                                                     <alias name='imp_otros_ajus' />,
                MIN(cinmcomp.fecfac) <alias name='fecha_adq' />,
                MIN(NVL(cinmcomp.auxnum3, cinmcomp.fecini)) <alias name='fecha_uso' />,
                MIN(cinmftab.porcen) <alias name='porc_deprec' />,
                MIN(cinmcomp.fecha) <alias name='fec_contab' />
                
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
                        <join type='left' table='cinmftab'>
                            <on>cinmcomp.codfis = cinmftab.codigo</on>
                        </join>
                    </join>
            </from>
            <group>
                1
            </group>
        </select>
    `);



    // ===============================================================
    // RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.1
    // ===============================================================
    var mStringPle7_1 = Ax.db.executeQuery(` 
        <select>
            <columns>
                ${mIntYear} || '0000'                                                       <alias name='periodo' />,
                NVL(CASE WHEN tmp_cinmcval.fec_contab &lt; '01-01-${mIntYear}' THEN '00000000.'
                     ELSE cinmelem.auxchr2
                END, '')                                                                         <alias name='cuo' />,
                                                                            
                'A-M-C'    <alias name='corr_asiento' />,

                '9'                                                                         <alias name='cod_catalogo' />,
                cinmelem_ppe.ppe_label_id  <alias name='cod_activo' />,
                ''                                                                          <alias name='codigo_del_catalogo_utilizado' />,
                cinmhead.auxchr1                                                            <alias name='cod_existencia' />,
                '1'                                                                         <alias name='tipo_activo' />,
                ''                                                                          <alias name='cta_contable' />,
                '9'                                                                         <alias name='estado_act' />,
                cinmelem.nomele  <alias name='descripcion_activo' />,
                gartmarc.nommar  <alias name='marca' />,
                gartmode.nommod  <alias name='modelo' />,
                cinmelem_ppe.ppe_numser  <alias name='nro_serie' />,
                CASE WHEN tmp_activos_fijos.codigo = 14 THEN tmp_activos_fijos.imp_saldo_inicial ELSE 0 END              <alias name='imp_saldo_inicial' />,
                tmp_cinmcval.imp_adq_y_adic                 <alias name='imp_adq_y_adic' />,
                tmp_cinmcval.imp_mejoras                    <alias name='imp_mejoras' />,
                tmp_cinmcval.imp_ret_baj                    <alias name='imp_bajas' />,
                tmp_cinmcval.imp_otros_ajus                 <alias name='imp_ajustes' />,
                0  <alias name='imp_revaluac_volunt' />,
                0  <alias name='imp_revaluac_reorg' />,
                0  <alias name='imp_revaluac_otras' />,
                0  <alias name='imp_ajuste_inflac' />,
                tmp_cinmcval.fecha_adq                      <alias name='fecha_adq' />,
                tmp_cinmcval.fecha_uso                      <alias name='fecha_uso' />,
                '1'  <alias name='metodo_calc' />,
                '00000'  <alias name='nro_autoriz_camb_calc' />,
                tmp_cinmcval.porc_deprec                    <alias name='porc_deprec' />,
                CASE WHEN tmp_activos_fijos.ejerci = YEAR(TODAY)-1 THEN tmp_activos_fijos.impmax ELSE 0 END  <alias name='imp_depre_acumulada' />,
                CASE WHEN tmp_activos_fijos.ejerci = YEAR(TODAY) THEN tmp_activos_fijos.impmax ELSE 0 END <alias name='imp_depre_sin_revaluac' />,
                tmp_activos_fijos.imp_depre_bajas  <alias name='imp_depre_bajas' />,
                tmp_activos_fijos.imp_depre_ajustes  <alias name='imp_depre_ajustes' />,
                0  <alias name='imp_depre_revaluac_volunt' />,
                0  <alias name='imp_depre_revaluac_reorg' />,
                0  <alias name='imp_depre_revaluac_otras' />,
                0  <alias name='imp_depre_ajuste_inflac' />,
                '1'  <alias name='estado_ope' />,
                
                ${mStrColumn}
                <whitespace/>
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join type='left' table='${mTmpTableActivos}' alias='tmp_activos_fijos'>
                        <on>cinmelem.codinm = tmp_activos_fijos.codinm</on>
                        <on>cinmelem.codele = tmp_activos_fijos.codele</on>
                        <join type='left' table='crp_asiento_activofijo'>
                            <on>tmp_activos_fijos.loteid = crp_asiento_activofijo.ref</on>
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
        
                    <join type='left' table='${mTmpTableCinmcval}' alias='tmp_cinmcval'>
                        <on>cinmelem.seqno = tmp_cinmcval.seqno</on>
                    </join>
        
                </join>
            </from>
            <where>
                <!-- tmp_activos_fijos.ejerci &gt;= ${mIntYear} - 1 -->
    
                cinmelem.codele IN ('125006810', '125005146', '125005568', '125005147')
                <!-- cinmelem.codele = '125015843' -->
                <!-- 125005568 -->
            </where>
            <order>
                cinmelem.codele, tmp_activos_fijos.codigo
            </order>
        </select>
    `).toJSON();

    var mObjPle7_1 = JSON.parse(mStringPle7_1);
    var mArrayPle7_1 = mObjPle7_1.rowset;

    var i=0;
    var mIntSec = 1;
    mArrayPle7_1.forEach(row => {

        if(row[1] == '00000000.'){
            mArrayPle7_1[i][1] = row[1] + mIntSec;
            // mArrayPle7_1[i][2] = 'A' + mArrayPle7_1[i][1].replace(/\./g, "");
            mArrayPle7_1[i][2] = 'A' + mArrayPle7_1[i][1].split('.')[0];
            mIntSec++;
        } else {
            mArrayPle7_1[i][2] = 'M' + mArrayPle7_1[i][1].split('.')[0];
        }
        i++;
    });

    mObjPle7_1.rowset = mArrayPle7_1;
    mStringPle7_1 = JSON.stringify(mObjPle7_1)

    // mStringPle7_1 =
    var mRsPLE7_1 = new Ax.rs.Reader().json(options => {
        options.setStringResource(mStringPle7_1);
    });


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
    // LERRRRRRRRRRRAAAA000007010000OIM1.TXT
    // ===============================================================
    var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007010000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

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
        new Ax.rs.Writer(mRsPLE7_1).csv(options => {
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
        return mRsPLE7_1;
    }
}