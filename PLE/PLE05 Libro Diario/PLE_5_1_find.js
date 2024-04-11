
    /**
    * Name: pe_sunat_ple05_1_rep
    */

    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // ===============================================================
    var pStrCondicion   = Ax.context.variable.TIPO;
    var mIntYear        = parseInt(Ax.context.variable.YEAR);
    var mIntMonth       = parseInt(Ax.context.variable.MONTH);

    // ===============================================================
    // Construcción de la primera y ultima fecha del mes,
    // correspondiente al periodo informado
    // ===============================================================
    if(pStrCondicion == 'I') {
    var mDateTimeIniPeriodoInf = new Ax.util.Date(Ax.context.variable.FECINI);
    var mDateTimeFinPeriodoInf = new Ax.util.Date(Ax.context.variable.FECFIN).addDay(1);
} else {
    var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
    var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 1);
}

    // ===============================================================
    // Concatenación del identificador del periodo para el
    // reporte de SUNAT
    // ===============================================================
    var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

    /**
    * LOCAL FUNCTION: __getRSCapuntes
    *
    * @param       {obj}           pObjParam		Objeto con parametros
    *                                             {first_str,
    *                                              columns,
    *                                              periodo,
    *                                              tbl_tmp,
    *                                              fec_ini,
    *                                              fec_fin,
    *                                              order_str}
    **/
    function __getRSCapuntes (pObjParam){
    var mRsCapuntes = Ax.db.executeQuery(`
            <select ${pObjParam.first_str}>
                <columns>
                    ${pObjParam.columns}
                    ${pObjParam.periodo}                                                                                               <alias name='period' />,            <!-- Campo 01 -->
                    capuntes.asient||'.'||ROW_NUMBER() OVER (ORDER BY asient)                                                       <alias name='cuo' />,               <!-- Campo 02 -->
                    'M'||capuntes.asient                                                                                            <alias name='corr_asient' />,       <!-- Campo 03 -->
                    REPLACE(capuntes.cuenta, '.', '')::CHAR(18)                                                                     <alias name='cod_cuenta'/>,         <!-- Campo 04 -->
                    capuntes.proyec::CHAR(12)                                                                                       <alias name='cod_operacion' />,     <!-- Campo 05 -->
                    capuntes.seccio::CHAR(12)                                                                                       <alias name='cod_centro_costo' />,  <!-- Campo 06 -->
                    'PEN'                                                                                                           <alias name='moneda' />,            <!-- Campo 07 -->
                    CASE WHEN NVL(tmp_capuntes.ciftyp, '') IN (2,3) THEN '0'
                        WHEN NVL(tmp_capuntes.ciftyp, '') = 8 THEN 'A'
                        ELSE NVL(tmp_capuntes.ciftyp, '')
                    END                                                                                                             <alias name='tip_doc_emisor' />,    <!-- Campo 08 -->
                    NVL(REPLACE(REPLACE(tmp_capuntes.cifter, ' ', ''), '-', ''), '')                                                <alias name='num_doc_emisor' />,    <!-- Campo 09 -->
                    CASE WHEN NVL(tmp_capuntes.tipdoc, '00') = '99' THEN '00'
                        ELSE NVL(tmp_capuntes.tipdoc, '00')
                    END                                                                                                             <alias name='tip_doc_pago' />,      <!-- Campo 10 -->
                    CAST(
                        CASE WHEN CHARINDEX('-', capuntes.docser) &gt; 0 THEN REPLACE(TRIM(SUBSTRING_INDEX(capuntes.docser, '-', 1)), '/', '')
                            WHEN NVL(tmp_capuntes.tipdoc, '00') = '46' THEN '0000'
                            ELSE ''
                        END
                        AS CHAR(8)
                    )                                                                                                               <alias name='num_serie' />,         <!-- Campo 11 -->
            
                    CAST(
                        REPLACE(REPLACE(REPLACE(REPLACE(CASE WHEN LENGTH(SUBSTRING_INDEX(capuntes.docser, '-', -1)) > 0 THEN SUBSTRING_INDEX(capuntes.docser, '-', -1)
                                            WHEN LENGTH(SUBSTRING_INDEX(capuntes.docser, '-', -1)) = 0 THEN '1'
                                            ELSE capuntes.docser
                                        END, '/', ''), '*', ''), ' ', ''), '_', '')
                        AS CHAR(15)
                    )                                                                                                               <alias name='num_correlativo' />,   <!-- Campo 12 -->
                    TO_CHAR(capuntes.fecha, '%d/%m/%Y')                                                                             <alias name='fecha_contable' />,    <!-- Campo 13 -->
                    TO_CHAR(NVL(tmp_capuntes.fecven, capuntes.fecha), '%d/%m/%Y')                                                   <alias name='fecha_vencimiento' />, <!-- Campo 14 -->
                    TO_CHAR(NVL(tmp_capuntes.fecdoc, capuntes.fecha), '%d/%m/%Y')                                                   <alias name='fecha_operacion' />,   <!-- Campo 15 -->
                    CAST(CASE WHEN NVL(capuntes.concep, '-1') = '-1' OR LENGTH(capuntes.concep) = 0 THEN 'NN '||capuntes.docser
                            ELSE REPLACE(capuntes.concep, '|', '')
                        END
                    AS VARCHAR(200))                                                                                                <alias name='glosa' />,             <!-- Campo 16 -->
                    ''                                                                                                              <alias name='glosa_referencial' />, <!-- Campo 17 -->
                    CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))                                                                    <alias name='mov_debe' />,          <!-- Campo 18 -->
                    CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))                                                                   <alias name='mov_haber' />,         <!-- Campo 19 -->
                    ''                                                                                                              <alias name='cod_libro' />,         <!-- Campo 20 -->
                    '1'                                                                                                             <alias name='estado_operacion' />,  <!-- Campo 21 -->
                    <whitespace/>
                </columns>
                <from table='capuntes'>
                    
    
                    <join type='left' table='${pObjParam.tbl_tmp}' alias='tmp_capuntes'>
                        <on>capuntes.apteid = tmp_capuntes.apteid</on>
                    </join>
                </from>
                <where> 
                    capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                </where>
                ${pObjParam.order_str}
            </select>
        `, pObjParam.fec_ini, pObjParam.fec_fin).toMemory();

    return mRsCapuntes;
}

    var mIntNumCapuntes = Ax.db.executeGet(`
    <select>
        <columns>
            COUNT(*) cant
        </columns>
        <from table='capuntes' />
        <where>
            capuntes.fecha &gt;= ?
            AND capuntes.fecha &lt; ?
        </where>
    </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // mObjCapuntes.apteid_medio = Math.floor((mObjCapuntes.apteid_min + mObjCapuntes.apteid_max)/2).toString();
    if (mIntNumCapuntes % 1000000 == 0){
    var mIntNumParts = (mIntNumCapuntes / 1000000).toString();

} else {
    var mIntNumParts = Math.floor(mIntNumCapuntes / 1000000) + 1;
    mIntNumParts = mIntNumParts.toString()

}
    console.log(mIntNumCapuntes);
    console.log(mIntNumParts);

    // ===============================================================
    // TABLA TEMPORAL PARA CARTERA DE EFECTOS
    // ===============================================================
    let mTmpTableGrpCapuntes = Ax.db.getTempTableName(`tmp_tbl_cefectos`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGrpCapuntes}`);

    Ax.db.execute(`
    <select intotemp='${mTmpTableGrpCapuntes}'>
        <columns>
            capuntes.apteid,
            cefectos.fecven,
            NVL(ctax_move_head.taxh_tipdoc, cefectos.tipdoc) tipdoc,
            ctax_move_head.taxh_ciftyp ciftyp,
            ctax_move_head.taxh_cifter cifter,
            ctax_move_head.taxh_fecdoc fecdoc
        </columns>
        <from table='capuntes'>
            <lateral alias='cefectos'>
                <select first = '1'>
                    <columns>
                        cefectos.fecven,
                        cefectos.auxnum3 tipdoc
                    </columns>
                    <from table='cefectos' />
                    <where>
                        cefectos.apteid = capuntes.apteid
                    </where>
                </select>
            </lateral>

            <lateral alias='ctax_move_head'>
                <select first = '1'>
                    <columns>
                        ctax_move_head.taxh_ciftyp,
                        ctax_move_head.taxh_cifter,
                        ctax_move_head.taxh_tipdoc,
                        ctax_move_head.taxh_fecdoc
                    </columns>
                    <from table='ctax_move_head' />
                    <where>
                        ctax_move_head.taxh_apteid = capuntes.apteid
                    </where>
                </select>
            </lateral>
        </from>
        <where>
            capuntes.fecha &gt;= ?
            AND capuntes.fecha &lt; ?
        </where>
    </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // ===============================================================
    // RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 5.1
    // ===============================================================

    /**
    * TODO:
    *  Hasta que se determine, de forma temporal se esta manejando asi:
    *  - Lo definido en el campo 21 compara el periodo informado (lo establecido como data de entrada)
    *    con el periodo actual (determinado por la fecha de hoy), si ambos coinciden se establece '1',
    *    si el periodo informado es menor se establece como '8' y en otro caso se establece como '9'
    */




    // 20,315,062
    // 20,284,677

    // ===============================================================
    // Arreglo de códigos de cuentas que presentan error
    // de estructura:
    //  * campo10: tipo de comprobante de pago
    //  * campo12: número de comprobante de pago
    //  * campo15: fecha de la operación
    //  * campo16: glosa/descripción de la operación
    // ===============================================================
    var mArrayCodCtaError = [];

    var mIntContador = 0;
    var mNumCta = '';

    // ===============================================================
    // Recorrido de registros para validar la existencia de campos
    // requeridos para la estructura de SUNAT.
    // ===============================================================
    /*for(let mObjRegistro of mRsPle_5_1) {

    // ===============================================================
    // Limite de 20 registros como máximo para informar
    // registros erróneos, limitante de cantidad de
    // caracteres por el frontal
    // ===============================================================
    if(mIntContador < 20){

    // ===============================================================
    // Construcción de la estructura del código de cuenta
    // ===============================================================
    mNumCta = (mObjRegistro.campo4.length > 9) ? mObjRegistro.campo4.substr(0, 9)+ '.' + mObjRegistro.campo4.substr(9) : mObjRegistro.campo4;

    // ===============================================================
    // Si algún campo requerido es null, se registra el numero
    // de cuenta en el arreglo definido.
    // ===============================================================
    if (!mObjRegistro.campo10 || !mObjRegistro.campo12 || !mObjRegistro.campo15 || !mObjRegistro.campo16) {
    mArrayCodCtaError.push(mNumCta);
}
    mIntContador++;
} else {
    break;
}
}*/

    // ===============================================================
    // Variables para el nombre del archivo
    // ===============================================================
    var mStrRuc             = '20100121809';
    var mStrYear            = mIntYear;
    var mStrMonth           = mIntMonth < 10 ? '0'+mIntMonth : mIntMonth;
    var mIntIndOperacion    = 1;
    var mIntContLibro       = 1;
    var mIntMoneda          = 1;

    // ===============================================================
    // Estructura de nombre del archivo .txt de salida:
    // LERRRRRRRRRRRAAAAMM0005010000OIM1.txt
    // ===============================================================
    var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + '0005010000'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

    // ===============================================================
    // Si la condición del reporte es Fichero (F)
    // ===============================================================
    if(pStrCondicion == 'F') {

    var mRsPle_5_1 = __getRSCapuntes({
    first_str: '',
    columns: '',
    periodo: mStrCodPeriodo,
    tbl_tmp: mTmpTableGrpCapuntes,
    fec_ini: mDateTimeIniPeriodoInf,
    fec_fin: mDateTimeFinPeriodoInf,
    order_str: ''
});

    // ===============================================================
    // Si existen números de cuenta registrados en el arreglo
    // se lanza una excepción que informa corregir campos
    // faltantes del registro
    // ===============================================================
    /*if (mArrayCodCtaError.length > 0) {
        throw new Ax.ext.Exception(`El/los códigos de cuenta de capuntes, deben ser corregidos los tipo/número comprobante de pago, fecha de operación y descripcion: [${mArrayCodCtaError},...]`);
    }*/

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var blob = new Ax.sql.Blob(mStrFileName);

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPle_5_1).csv(options => {
    options.setHeader(false);
    options.setDelimiter("|");
    options.setResource(blob);
});
    mRsPle_5_1.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
    var zip = new Ax.util.zip.Zip(ficherozip);

    zip.zipFile(blob);
    zip.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst = new Ax.io.File(ficherozip.getAbsolutePath());
    var fichero = new Ax.sql.Blob(dst);

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
    options.setColumnNames(["nombre", "archivo"]);
    options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
});
    mRsFile.rows().add([mStrFileName, fichero.getBytes()]);

    return mRsFile;

    // ===============================================================
    // Si la condición del reporte es CSV (C)
    // ===============================================================
} else if(pStrCondicion == 'C') {

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
    options.setColumnNames(["nombre", "archivo"]);
    options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
});

    /**
     * ARCHIVO CSV PARTE 1
     */
    var mStrNameFile = 'ple_0501_'+mIntYear+'_'+mIntMonth+'_part1';
    var mRsPle_5_1_pt1 = __getRSCapuntes({
    first_str: '',
    columns: 'FIRST 1000000 capuntes.apteid,',
    periodo: mStrCodPeriodo,
    tbl_tmp: mTmpTableGrpCapuntes,
    fec_ini: mDateTimeIniPeriodoInf,
    fec_fin: mDateTimeFinPeriodoInf,
    order_str: '<order>capuntes.apteid</order>'
});

    var blob_pt1 = new Ax.sql.Blob(mStrNameFile+'.csv');

    new Ax.rs.Writer(mRsPle_5_1_pt1).csv(options => {
    options.setCharset('ISO-8859-1');
    options.withQuote('"');                 // Character used to quote fields
    options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

    options.setQuoteChar('"');
    options.setDelimiter("|");
    options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

    options.setResource(blob_pt1);

    // Add a header for Excel to allow it recognises file as CSV
    options.setHeaderText("sep=" + options.getDelimiter());
});
    mRsPle_5_1_pt1.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var ficherozip_pt1 = new Ax.io.File("/tmp/"+mStrNameFile+".zip");
    var zip_pt1 = new Ax.util.zip.Zip(ficherozip_pt1);

    zip_pt1.zipFile(blob_pt1);
    zip_pt1.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst_pt1 = new Ax.io.File(ficherozip_pt1.getAbsolutePath());
    var fichero_pt1 = new Ax.sql.Blob(dst_pt1);

    mRsFile.rows().add([mStrNameFile+'.zip', fichero_pt1.getBytes()]);

    for(var i=1; i < mIntNumParts; i++){
    /**
     * ARCHIVO CSV PARTE 2
     */
    var mStrNameFile = 'ple_0501_'+mIntYear+'_'+mIntMonth+'_part'+(i+1);
    var mRsPle_5_1_pt2 = __getRSCapuntes({
    first_str: ``,
    columns: `SKIP ${1000000*i} FIRST 1000000 capuntes.apteid,`,
    periodo: mStrCodPeriodo,
    tbl_tmp: mTmpTableGrpCapuntes,
    fec_ini: mDateTimeIniPeriodoInf,
    fec_fin: mDateTimeFinPeriodoInf,
    order_str: '<order>capuntes.apteid</order>'
});
    // mRsPle_5_1_pt2 = mRsPle_5_1_pt2.rows().sort('apteid');

    var blob_pt2 = new Ax.sql.Blob(mStrNameFile+'.csv');

    new Ax.rs.Writer(mRsPle_5_1_pt2).csv(options => {
    options.setCharset('ISO-8859-1');
    options.withQuote('"');                 // Character used to quote fields
    options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

    options.setQuoteChar('"');
    options.setDelimiter("|");
    options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

    options.setResource(blob_pt2);

    // Add a header for Excel to allow it recognises file as CSV
    options.setHeaderText("sep=" + options.getDelimiter());
});
    mRsPle_5_1_pt2.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var ficherozip_pt2 = new Ax.io.File("/tmp/"+mStrNameFile+".zip");
    var zip_pt2 = new Ax.util.zip.Zip(ficherozip_pt2);

    zip_pt2.zipFile(blob_pt2);
    zip_pt2.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst_pt2 = new Ax.io.File(ficherozip_pt2.getAbsolutePath());
    var fichero_pt2 = new Ax.sql.Blob(dst_pt2);

    mRsFile.rows().add([mStrNameFile+'.csv', fichero_pt2.getBytes()]);
}



    return mRsFile;
    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if(pStrCondicion == 'I') {

    var mRsPle_5_1 = __getRSCapuntes({
    first_str: '',
    columns: 'capuntes.apteid,',
    periodo: mStrCodPeriodo,
    tbl_tmp: mTmpTableGrpCapuntes,
    fec_ini: mDateTimeIniPeriodoInf,
    fec_fin: mDateTimeFinPeriodoInf,
    order_str: ''
});
    // return mRsPle_5_1.rows().sort('apteid');

    return mRsPle_5_1;
}


