// Modifica el estado de las líneas de la tabla cxls_apuntes_load
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
//var mTbDatosCosc = console.HTMLTable(`Cargador Fichero (cxls_apuntes_load, ccoscont)`, ['N. Registre', 'Estado']);

// CAMBIAR EL ESTADO DEL REGISTRO, PARA QUE NO SE PUEDE TOCAR
__setFieldControlStatus(Ax.context.data.seqno, 1, 0);

// OBTENER EL EXCEL TEMPLATE
var mBlobExcCapuntes = Ax.db.executeQuery(`
        <select>
            <columns>
                seqno, load_exc_data, load_exc_type
            </columns>
            <from table='cxls_apuntes_load' />  
            <where>
                cxls_apuntes_load.seqno = ?
            </where>  
        </select>
    `, Ax.context.data.seqno).toOne();

try{
    // COMPROBAR QUE EL DOCUMENTO TIENE FORMATO DE EXCEL
    try{
        var wb = Ax.ms.Excel.load(mBlobExcCapuntes.load_exc_data);
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel")
    }

    // ACTUALIZAR LAS FORMULAS DENTRO DEL EXCEL
    wb.evaluate();

    // CARGA DEL EXCEL APARTIR DE UN BLOB
    var mRsSheet = wb.getSheet(0)

    // Eliminar las líneas que no tienen valor
    mRsSheet.packRows()

    // Salta exception en caso de no haber lineas registradas al Excel
    var mIntCount = mRsSheet.getLastRowNum();
    if (mIntCount < 7){
        throw new Ax.ext.Exception("No existen registros en la hoja de Excel");
    }

    // RESULT SET DE LOS VALORES DEL EXCEL
    // Se registran las celdas del excel con nombre header.
    var mRsHeaders = wb.select(options => {
        options.setTableName("header");
        options.setStartRow(wb.getNamedRow("header") + 1);
        options.setEvaluate(true);
    });
    var mHeaders= mRsHeaders.firstOne();

    // Se registran las celdas del excel con nombre capuntes.
    var mRsCapuntes = wb.select(options => {
        options.setTableName("capuntes");
        options.setStartRow(wb.getNamedRow("capuntes") + 1);
        options.setEvaluate(true);
    });

    // INSERTAR VALOR A TABLA TEMPORAL
    new Ax.rs.Writer(mRsCapuntes).db(options => {

        options.setConnection(Ax.db.getObject());
        options.setTableName(`tmpTable`);
        Ax.db.execute(`DROP TABLE IF EXISTS tmpTable`);
        options.setTableCreateTemp(true);

        options.setColumnType('debe','decimal');
        options.setColumnType('haber','decimal');

        options.setColumnSize('cuelin',18);
        options.setColumnSize('debe',14);
        options.setColumnSize('haber',14);
    });

    // Obtener los valores de la tabla temporal agrupados por (referenciado a capuntes):
    //     proyecto, sección, cuenta, auxiliar, concepto y descripción
    var mObjRegCapuntes= Ax.db.executeQuery(`
            <select>
                <columns>
                    proylin, seclin,
                    cuelin, auxiliar, 
                    concep, descri,
                    SUM(debe) debe,
                    SUM(haber) haber
                </columns>
                <from table='tmpTable' />
                <group>
                    1,2,3,4,5,6
                </group>
                <order>
                    seclin
                </order>
            </select>
        `).toMemory();

    // Insertar registro a la tabla cenllote para obtener el número de lote
    var mIntLoteid = Ax.db.insert('cenllote', {tabname : 'cxls_apuntes_load'}).getSerial();

    // Se obtiene el número de asiento
    var mIntAsient = Ax.db.executeFunction("icon_nxt_asient", mHeaders.empcode, mHeaders.fecha, 1).toValue();
    var mIntContador = 1;

    // INSERTAR CADA REGISTRO A LA TABLA DE CAPUNTES
    for (var mRegCapuntes of mObjRegCapuntes){

        //Comprobar los campos debe y haber tienen valor
        if (mRegCapuntes.debe == null || mRegCapuntes.haber == null){
            throw new Ax.ext.Exception("Debe y Haber no pueden ser nulos")
        }

        if (mRegCapuntes.proylin != null){
            var mObjDataAp = {
                loteid  : mIntLoteid,
                diario  : mHeaders.diario,
                moneda  : mHeaders.moneda,
                cambio  : mHeaders.cambio,
                empcode : mHeaders.empcode,
                proyec  : mRegCapuntes.proylin,
                seccio  : mRegCapuntes.seclin,
                jusser  : mHeaders.jusser,
                docser  : mHeaders.docser,
                fecha   : mHeaders.fecha,
                asient  : mIntAsient,
                orden   : mIntContador,
                placon  : mHeaders.placon,
                cuenta  : mRegCapuntes.cuelin,
                codcon  : mRegCapuntes.seclin,
                concep  : mRegCapuntes.descri,
                debe    : Ax.math.bc.div(mRegCapuntes.debe, mHeaders.cambio, 2),
                haber   : Ax.math.bc.div(mRegCapuntes.haber, mHeaders.cambio, 2),
                divdeb  : mRegCapuntes.debe || 0,
                divhab  : mRegCapuntes.haber || 0,
                sistem  : mHeaders.sistem,
                fecval  : mHeaders.fecval,
                ctaaux  : mRegCapuntes.auxiliar,
                origen  : 'E'
            }

            // Insertar el registro a la tabla capuntes y guardar el serial
            var mIntApteid = Ax.db.insert('capuntes', mObjDataAp).getSerial();

            var mIntZero = 0;

            // INSERTAR REGISTROS A LA TABLA ccoscont SEGÚN LA CABECERA DE capuntes CORRESPONDIENTE
            var mDate = (new Ax.util.Date(mHeaders.fecha)).format("dd-MM-yyyy");
            Ax.db.execute(`INSERT INTO ccoscont (apteid, fecha, diario, empcode, proyec, seccio, jusser, docser, placon, cuenta, 
                                                    dimcode1, dimcode2, ctaexp, centro, sistem, codcon, concep, debe, haber)
                                    SELECT  ${mIntApteid}, '${mDate}', '${mHeaders.diario}', '${mHeaders.empcode}',
                                            a.proylin, a.seclin, '${mHeaders.jusser}', '${mHeaders.docser}', '${mHeaders.placon}',
                                            a.cuelin, ${mIntZero}, ${mIntZero}, a.ctaexp, a.cencos, '${mHeaders.sistem}',
                                            a.concep, a.descri, SUM(a.debe/${mHeaders.cambio}), SUM(a.haber/${mHeaders.cambio})
                                      FROM tmpTable a
                                     WHERE a.proylin = ?
                                       AND a.seclin = ?
                                       AND a.cuelin = ?
                                       AND a.auxiliar = ?
                                       AND a.concep = ?
                                       AND a.descri = ?
                                       AND a.cencos IS NOT null 
                                       AND a.ctaexp IS NOT null
                                     GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
                `, mRegCapuntes.proylin, mRegCapuntes.seclin, mRegCapuntes.cuelin,
                mRegCapuntes.auxiliar, mRegCapuntes.concep, mRegCapuntes.descri);

            // Registre a la taula HTML de capuntes
            mTbDatosApunt.addRow([mIntContador, 'Procesado']);
            //var mTbCapuntes = mTbDatosApunt.addTable("capuntes", ['ID Apunte', 'Empresa', 'Concepto', 'Fecha', 'Debe', 'Haber']);
            //mTbCapuntes.addRow([mIntApteid, mHeaders.empcode, mRegCapuntes.descri, mHeaders.fecha, mRegCapuntes.debe/mHeaders.cambio, mRegCapuntes.haber/mHeaders.cambio]);

            mIntContador = mIntContador + 1
        }
    }

    // CONTROL DEL DEBE Y HABER INSERTADO, ESTOS DEBEN SER GUALES
    Ax.db.executeProcedure("capuntes_debe_haber_cuadre", mHeaders.empcode, mHeaders.fecha, mIntAsient, 0);

    // ACTUALIZAR ESTADO Y CAMPOS DE CONTROL
    __setFieldControlStatus(Ax.context.data.seqno, 2, mIntLoteid);

    // INSERTAR REGISTRE A LA TAULA clogprohtml
    var mHTMLApunt = mTbDatosApunt.toString();
    __cloghtmlInsert("capuntesLoad", mHTMLApunt, mBlobExcCapuntes.seqno);
    //Ax.db.rollbackWork();

} catch(e){
    Ax.db.rollbackWork();

    // ACTUALIZAR EL ESTADO DE LA TABLA
    __setFieldControlStatus(Ax.context.data.seqno, 3, 0, e.message);

    // REGISTRAR E INSERTAR EL ERROR AL HTMLTABLE
    mTbDatosApunt.addRow([mIntContador, e.message]);

    var mHTMLApunt = mTbDatosApunt.toString();
    __cloghtmlInsert("capuntesLoad", mHTMLApunt, mBlobExcCapuntes.seqno);

    // PANTALLA DE ERROR
    throw new Ax.ext.Exception (e.message);
}