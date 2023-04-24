/**
 * Name: pe_sunat_ple06_rep
 */

// ===============================================================
// Tipo de reporte y año/mes del periodo informado
// =============================================================== 
var mStrCondicion   = 'I';
var mIntEjercicio   = 2023;
var mIntPeriodo     = 4;
// var mStrCondicion   = Ax.context.variable.TIPO;
// var mIntEjercicio   = Ax.context.variable.YEAR;
// var mIntPeriodo     = Ax.context.variable.MONTH;

// ===============================================================
// Construcción de la primera y ultima fecha del mes, 
// correspondiente al periodo informado
// ===============================================================
var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntEjercicio, mIntPeriodo, 1);
var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntEjercicio, mIntPeriodo + 1, 0);

// ===============================================================
// TABLA TEMPORAL PARA CARTERA DE EFECTOS
// ===============================================================
let mTmpTableCefectos = Ax.db.getTempTableName(`@tmp_tbl_cefectos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCefectos}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableCefectos}'>
        <columns>
            capuntes.apteid, 
            MAX(cefectos.fecven) fecven 
        </columns>
        <from table='capuntes'>
            <join type='left' table="cefectos">
                <on>capuntes.apteid = cefectos.apteid</on>
            </join>
        </from>
        <where>
            capuntes.fecha   BETWEEN ? AND ?
        </where>
        <group>1</group> 
    </select>
`, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

var numerroer = 0;
// ===============================================================
// Generación del ResultSet para el PLE
// ===============================================================
var mRsPle5_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            capuntes.apteid,
            csaldos.cuenta,
            csaldos.proyec,
            csaldos.seccio,
            csaldos.moneda,
            ctax_move_head.taxh_cifter,
            ctax_move_head.taxh_auxchr4,
            ctax_move_head.taxh_refter,
            ctax_move_head.taxh_refter,
            capuntes.fecha,
            tmp_cefectos.fecven,
            ctax_move_head.taxh_fecdoc,
            capuntes.concep,
            capuntes.debe,
            capuntes.haber,
            <whitespace/>
        </columns>
        <from table='csaldos'>
            <join type='left' table="capuntes">

                <on>csaldos.empcode = capuntes.empcode</on>
                <on>csaldos.cuenta  = capuntes.cuenta</on>
                <on>csaldos.codaux  = NVL(capuntes.codaux, 0)</on>
                <on>csaldos.ctaaux  = NVL(capuntes.ctaaux, 0)</on>
                <on>csaldos.moneda  = capuntes.moneda</on>
                <on>csaldos.proyec  = capuntes.proyec</on>
                <on>csaldos.seccio  = capuntes.seccio</on>
                <on>csaldos.sistem  = capuntes.sistem</on>
                <on>capuntes.fecha   BETWEEN ? AND ?</on>

                <join table='@tmp_tbl_cefectos' alias='tmp_cefectos'>
                    <on> capuntes.apteid = tmp_cefectos.apteid</on>
                </join>

                <join type='left' table="ctax_move_head">
                    <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                </join>

            </join>
        </from>
        <where>
            csaldos.ejerci = ?
            AND csaldos.period = ?
        </where> 
    </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mIntEjercicio, mIntPeriodo).toMemory();

var mArrayCodCuentas = [];

// mRsPle5_3.forEach(item => {
//     if(item.campo2.length < 3){
//         mArrayCodCuentas.push(item.campo2);
//     }
// });



// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntEjercicio;
var mStrMonth           = (mIntPeriodo < 10 ? '0'+mIntPeriodo : mIntPeriodo);
var mIntIndOperacionO   = 1;
var mIntContLibroI      = 1;
var mIntMonedaM         = 1; 

// ===============================================================
// Estructura de nombre del archivo txt de salida: 
// LE RRRRRRRRRRR AAAA MM 0006010000OIM1.TXT
// ===============================================================

// LE                  RRRRRRRRRRR    AAAA         MM       0006010000           O                  I              M          1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + mStrMonth + '0006010000' + mIntIndOperacionO + mIntContLibroI + mIntMonedaM + '1.txt'; 

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (mStrCondicion == 'F') { 
    if (mArrayCodCuentas.length > 0) {
        throw new Ax.ext.Exception(`El/los códigos de Cuentas Contables, deben tener entre 3 y 24 dígitos: [${mArrayCodCuentas}]`);
    }

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var mBlob = new Ax.sql.Blob(mStrNameFile); 

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPle5_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(mBlob);
    }); 

    mRsPle5_3.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var mFicheroZip  = new Ax.io.File("/tmp/ziptest.zip");
    var mZip         = new Ax.util.zip.Zip(mFicheroZip); 

    mZip.zipFile(mBlob);
    mZip.close(); 

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var mDestino    = new Ax.io.File(mFicheroZip.getAbsolutePath()); 
    var mFichero    = new Ax.sql.Blob(mDestino); 

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, mFichero.getBytes()]);

    return mRsFile; 
    
    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if (mStrCondicion == 'I') {
    return mRsPle5_3;
}