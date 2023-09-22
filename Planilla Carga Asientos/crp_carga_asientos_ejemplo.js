
/**
 * OBJ: cxls_apuntes_master
 *
 *
 * */

// Función que modifica el estado de las líneas de la tabla cxls_apuntes_load
function __setFieldControlStatus(pIntSeqno, pIntStatus, pIntLoteId, pStrError) {

    Ax.db.update("cxls_apuntes_load",
        {
            load_status  : pIntStatus,
            loteid       : pIntLoteId,
            load_err_message : pStrError || null,
            user_updated : Ax.ext.user.get().getCode(),
            date_updated : new Ax.sql.Date()
        },
        {
            seqno : pIntSeqno
        }
    )
}

// Función que inserta el log a la tabla cloghtml
function __cloghtmlInsert (pStrName, pStrData, pIntID){
    var mBlob = new Ax.sql.Blob(`${pStrName}.html`);
    mBlob.setContentType("application/html");
    mBlob.setContent(`${pStrData}`);

    Ax.db.insert('cloghtml',
        {
            log_data : mBlob,
            log_type : mBlob.getContentType(),
            log_proces : "cxls_apuntes_load",
            proces_id : pIntID,
            log_date : new Ax.util.Date(),
            log_user: Ax.ext.user.get().getCode()
        });
}

// Registro tabla HTML
var mTbDatosApunt = console.HTMLTable(`Cargador Fichero (cxls_apuntes_load, capuntes)`, ['N. Registre', 'Estado']);

// Cargar el fichero excel
var cxls_apuntes_load = Ax.db.executeQuery(`
    <select>
        <columns>
            seqno, load_exc_data, load_exc_type
        </columns>
        <from table='cxls_apuntes_load'/>  
        <where>
            cxls_apuntes_load.seqno = ?
        </where>  
    </select>
`, data.seqno).toOne().setRequired(`cxls_apuntes_load [${data.seqno}] not found`);

var mIntContador = 1;
var rsTabname = {};

try {

    Ax.db.beginWork();

    // Update para bloquear el registro de cxls_apuntes_load
    Ax.db.update('cxls_apuntes_load', {'load_exc_type' : cxls_apuntes_load.load_exc_type}, {'seqno' : cxls_apuntes_load.seqno});

    // Workbook
    var workbook = Ax.ms.Excel.load(cxls_apuntes_load.load_exc_data);

    // Recuperar los datos del excel en resultSet
    var rs_excelData = workbook.select(options => {
        options.setTableName('capuntes');
        options.setStartRow(workbook.getNamedRow(table) + 1);
        options.setEvaluate(true);
    });

    if (rs_excelData == null)
        continue;

    // Columnas necesarias para llamar a ctables_wb_account_insert
    rs_excelData.cols().add('orden', Ax.sql.Types.INTEGER, () => 0);
    rs_excelData.cols().add('origen', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('agrupa', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('dimcode1', Ax.sql.Types.INTEGER, () => null);
    rs_excelData.cols().add('dimcode2', Ax.sql.Types.INTEGER, () => null);
    rs_excelData.cols().add('codcon', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('concep', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('contra', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('codaux', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('ctaaux', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('centro', Ax.sql.Types.CHAR, () => null);
    rs_excelData.cols().add('cantid1', Ax.sql.Types.INTEGER, () => 0);
    rs_excelData.cols().add('cantid2', Ax.sql.Types.INTEGER, () => 0);
    rs_excelData.cols().add('divdeb', Ax.sql.Types.INTEGER, () => 0);
    rs_excelData.cols().add('divhab', Ax.sql.Types.INTEGER, () => 0);

    // Generar casientos por cada id_asiento
    rs_excelData.sortByColumns('id_asiento').cursor()
        .group("id_asiento")
        .before(rowCasientos => {

            // Seleccionar los registros del mismo asiento
            var rsTabname['capuntes'] = rs_excelData.rows().select(row => {
                return row.id_asiento == rowCasientos.id_asiento;
            }).rows();

            // Generar casientos y capuntes
            var id_asiento = Ax.db.call("ctables_wb_account_insert", null, rsTabname, null, null);
        })
        .forEach(row => {})

    // Actualizar cxls_apuntes_load
    __setFieldControlStatus(data.seqno, 2, id_asiento);

    // INSERTAR REGISTRE A LA TAULA clogprohtml
    var mHTMLApunt = mTbDatosApunt.toString();
    __cloghtmlInsert("capuntesLoad", mHTMLApunt, cxls_apuntes_load.seqno);

    Ax.db.commitWork();
} catch(e){
    Ax.db.rollbackWork();

    __setFieldControlStatus(data.seqno, 1, 0, e.message);

    // REGISTRAR E INSERTAR EL ERROR AL HTMLTABLE
    mTbDatosApunt.addRow([mIntContador, e.message]);

    var mHTMLApunt = mTbDatosApunt.toString();
    __cloghtmlInsert("capuntesLoad", mHTMLApunt, cxls_apuntes_load.seqno);

    throw new Ax.ext.Exception (e.message);
}