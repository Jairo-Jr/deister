function crp_crpi_comprobante_csv(pSqlCond, pObjCond) {

    var mStrFecIni = pObjCond.FECINI;
    var mStrFecFin = pObjCond.FECFIN;

    var mStrEjerciCond = '1=1';

    if (mStrFecIni != undefined && mStrFecFin != undefined) {
        mStrFecIni = mStrFecIni.toString().replaceAll('-', '');
        mStrFecFin = mStrFecFin.toString().replaceAll('-', '');

        mStrEjerciCond = `fecharegistrocorto BETWEEN '` + mStrFecIni +`' AND '` + mStrFecFin + `'`;
    }
    console.log(mStrEjerciCond);
    // Variables de entrada
    // var mIntNumrem = Ax.context.variable.NUMREM;

    // Obtencion de pagos a proveedores
    var mRsCrpiComprobante = Ax.db.executeQuery(`
        <select oracle='ansi'>
            <columns>
                crp_crpi_comprobante.idrecibopago,                crp_crpi_comprobante.idcomprobante,
                crp_crpi_comprobante.idsistema,                   crp_crpi_sistema.descripcion desc_sistema,
                crp_crpi_comprobante.idtipocomprobante,           crp_crpi_tipo_comprobante.descripcion descrip_comprobante,
                crp_crpi_comprobante.idzona,                      crp_crpi_comprobante.idserie,
                crp_crpi_comprobante.idadmision,                  crp_crpi_comprobante.idclienteparticular,
                crp_crpi_comprobante.idmedicoaccionista,          crp_crpi_comprobante.idmedicocolaborador,
                crp_crpi_comprobante.idreceptorcomprobante,       crp_crpi_comprobante.idestadocomprobante,
                crp_crpi_comprobante.idestadocomprobantesunat,    crp_crpi_comprobante.idcomprobantereferencia,
                crp_crpi_comprobante.idliquidacion,               crp_crpi_comprobante.numeroguiafarmacia,           crp_crpi_guia_interna.codigoalmacen,
                crp_crpi_comprobante.seriecomprobante,            crp_crpi_comprobante.correlativocomprobante,
                crp_crpi_comprobante.seriecorrelativocomprobante, crp_crpi_comprobante.seriecorrelativocomprobsunat,
                crp_crpi_comprobante.numerosesionsupervisor,      crp_crpi_comprobante.numerosesioncajero,
                crp_crpi_comprobante.tipocambiodolar,             crp_crpi_comprobante.porcentajeigv,
                crp_crpi_comprobante.importesubtotal,             crp_crpi_comprobante.importeigv,
                crp_crpi_comprobante.importetotal,                crp_crpi_comprobante.importeredondeo,
                crp_crpi_comprobante.importepago,                 crp_crpi_comprobante.importevuelto,
                crp_crpi_comprobante.importesubtotalbimoneda,     crp_crpi_comprobante.importeigvbimoneda,
                crp_crpi_comprobante.importetotalbimoneda,        crp_crpi_comprobante.importeredondeobimoneda,
                crp_crpi_comprobante.importepagobimoneda,         crp_crpi_comprobante.fecharegistro,
                crp_crpi_comprobante.fecharegistrocorto,          crp_crpi_comprobante.horaregistro,
                crp_crpi_comprobante.fechaanulacion,              crp_crpi_comprobante.fechaanulacioncorto,
                crp_crpi_comprobante.horaanulacion,               crp_crpi_comprobante.observaciones,
                crp_crpi_comprobante.flagpagomultiple,            crp_crpi_comprobante.flagpagonocancela,
                crp_crpi_comprobante.flagliquidacion,             crp_crpi_comprobante.controlsistemaemision,
                crp_crpi_comprobante.controlsistemacancelacion,   crp_crpi_comprobante.iddatocomprobante,
                crp_crpi_comprobante.importetotaldeposito,        crp_crpi_comprobante.importetotalcobrodeclarado,
                crp_crpi_comprobante.flagderivarvueltotesoreria,  crp_crpi_comprobante.flagemitidofacturacionchavin,
                crp_crpi_comprobante.fechaliquidacion,            crp_crpi_comprobante.flagcajeropagador,
                crp_crpi_comprobante.flagorigenliquidacion,       crp_crpi_comprobante.numerosesioncajeroaplicacancel,
                crp_crpi_comprobante.flagnotacreditoinhabilitada, crp_crpi_comprobante.flagpagounico,
                crp_crpi_comprobante.idpagounico,                 crp_crpi_comprobante.idcontrato,
                crp_crpi_comprobante.flagplansalud,               crp_crpi_comprobante.flagemitidoplansalud,
                crp_crpi_comprobante.importeinafecto,             crp_crpi_comprobante.importeinafectobimoneda,
                crp_crpi_comprobante.tabdes,
                crp_crpi_comprobante.cabdes,                      crp_crpi_comprobante.date_load_ifas,
                crp_crpi_comprobante.message_error_ifas,          crp_crpi_comprobante.estado,
                crp_crpi_comprobante.user_received,               crp_crpi_comprobante.date_received,
                crp_crpi_comprobante.user_processed,              crp_crpi_comprobante.date_processed,
                crp_crpi_comprobante.message_error,               crp_crpi_comprobante.date_error
            </columns>
            <from table="crp_crpi_comprobante">
                <join type='left' table='crp_crpi_sistema'>
                    <on>crp_crpi_comprobante.idsistema = crp_crpi_sistema.idsistema</on>            
                </join>
                <join type='left' table='crp_crpi_tipo_comprobante'>
                    <on>crp_crpi_comprobante.idtipocomprobante = crp_crpi_tipo_comprobante.idtipcomp</on>            
                </join>         
                <join type="left" table="crp_crpi_guia_interna">
                    <on>crp_crpi_comprobante.numeroguiafarmacia = crp_crpi_guia_interna.numeroguia</on>
                </join>        
            </from>
            <where>
                ${mStrEjerciCond}
                AND ${pSqlCond}
            </where>
        </select>
    `);
    console.log(mRsCrpiComprobante);

    // Variables para Repositorio de Soportes Magnéticos
    var mStrFileProc = 'capuntes_periodo_csv';
    var mStrFileName = mStrFecIni + '_' + mStrFecFin + '_asientos';
    var mStrFileArgs = 'Ejercicio: ' + mStrFecIni + '\n' +
        'Periodo: ' + mStrFecFin;
    var mFileMemo = 'Asientos '+mStrFecIni + '/' + mStrFecFin;
    var mStrFileType = 'application/zip';
    var mIntFileSize = 0;
    var mStrFileMd5;
    var mBlobFileData;

    // // Define el Blob
    // var blob = new Ax.sql.Blob(mStrFileName + '.csv');

    // // Definicion del archivo txt
    // new Ax.rs.Writer(mRsCrpiComprobante).csv(options => {
    //     options.setCharset('ISO-8859-1');
    //     options.setHeader(false);
    //     options.setDelimiter("|");
    //     options.setResource(blob);
    // });


    var blob = new Ax.sql.Blob(mStrFileName + ".csv");
    new Ax.rs.Writer(mRsCrpiComprobante).csv(options => {
        options.setCharset('ISO-8859-1');
        options.withQuote('"');                 // Character used to quote fields
        options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

        options.setQuoteChar('"');
        options.setDelimiter("|");
        options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

        options.setResource(blob);

        // Add a header for Excel to allow it recognises file as CSV
        options.setHeaderText("sep=" + options.getDelimiter());
    });


    // Definición del archivo zip
    var ficherozip  = new Ax.io.File("/tmp/" + mStrFileName +".zip");
    var zip         = new Ax.util.zip.Zip(ficherozip);

    zip.zipFile(blob);
    zip.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
    var fichero = new Ax.sql.Blob(dst);

    // Registro en Repositorio de soportes magnéticos (csopmagn).
    mIntFileSize = fichero.length();

    var digest = new Ax.crypt.Digest("MD5");
    mStrFileMd5 = digest.update(fichero).digest();

    mBlobFileData = fichero;

    // Elimina registros existentes con el mismo MD5
    // Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrFileMd5);

    // Define objeto para csopmagn
    var csopmagn = {
        file_proc: mStrFileProc,
        file_name: mStrFileName + '.zip',
        file_memo    : mFileMemo,
        file_args: mStrFileArgs,
        file_type: mStrFileType,
        file_size: mIntFileSize,
        file_md5: mStrFileMd5,
        file_data: mBlobFileData,
        user_created: Ax.db.getUser(),
        date_created: new Ax.util.Date(),
        user_updated: Ax.db.getUser(),
        date_updated: new Ax.util.Date()
    }

    var mIntImgid = Ax.db.insert('csopmagn', csopmagn).getSerial();

    return Ax.db.executeQuery(`
        <select>
           <columns>
                *
            </columns>
           <from table='csopmagn' />
           <where>
                file_seqno = ?
            </where>
        </select>
    `, mIntImgid);

}

var pObjCond = {
    FECINI: '2023-09-13',
    FECFIN: '2023-11-13'
}

crp_crpi_comprobante_csv('1=1', pObjCond)