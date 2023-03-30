var pStrCondicion = Ax.context.variable.TIPO;
var mIntYear = Ax.context.variable.YEAR;

var mNumTipCambio = Ax.db.executeGet(`
    <select first='1'>
        <columns>
            ccambios.camcom
        </columns>
        <from table='ccambios'/>
        <where>
            tipcam = 'D'
            AND monori = 'PEN'
            AND moneda = 'USD'
            AND fecha = '31-12-${mIntYear}'
        </where>
    </select>
`);

/* TABLA TEMPORAL PARA ACTIVOS FIJOS */
let mTmpTableActivos = Ax.db.getTempTableName(`tmp_cinmelem_activos_fijos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableActivos}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableActivos}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele,
            MAX(cinmcomp.fecha) fecha,

            SUM( CASE WHEN cinmhead.estcom = 'A' AND cinmcomp.tipcom NOT IN ('I', 'A') 
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import_3' />,

            SUM( CASE WHEN cinmcomp.fecbaj IS NOT NULL
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import_2' />,

            SUM( CASE WHEN cinmhead.estcom = 'A' AND cinmcomp.tipcom IN ('I', 'A')
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import' />,

            SUM( CASE WHEN cinmcomp.divisa != 'PEN'
                    THEN cinmcomp.impfac
                    ELSE 0.00 
                END ) <alias name='imp_usd' />,

            MAX( CASE WHEN cinmcomp.divisa != 'PEN'
                    THEN cinmcomp.cambio
                    ELSE 0.00 
                END ) <alias name='tip_cambio' />,

            SUM( CASE WHEN cinmcomp.divisa = 'PEN'
                    THEN cinmcomp.impfac
                    ELSE 0.00 
                END ) <alias name='imp_pen' />,

            SUM( (CASE WHEN cinmcomp.divisa = 'PEN'
                    THEN cinmcomp.impfac
                    ELSE 0.00 
                END) - (CASE WHEN cinmcomp.divisa != 'PEN'
                    THEN cinmcomp.impfac
                    ELSE 0.00 
                END) * NVL(${mNumTipCambio}, 0.00) ) <alias name='ajuste' />

        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join table='cinmhead'>
                    <on>cinmcomp.empcode = cinmhead.empcode</on>
                    <on>cinmcomp.codinm  = cinmhead.codinm</on>
                </join>

                <join type='left' table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

                <!-- <join type='left' table='gcomfach'>
                    <on>gcomfach.cabid IN (SELECT gcomfacl.cabid FROM cinmcomp_orig, gcomfacl WHERE gcomfacl.linid = cinmcomp_orig.docid AND cinmcomp_orig.seqno = cinmcomp.seqno AND cinmcomp_orig.tabori = 'gcomfacl')</on>
                </join> -->

                <!-- <join type='left' table='cinmcomp_orig'>
                    <on>cinmcomp.seqno = cinmcomp_orig.seqno</on>

                    <join table='gcomfacl'>
                        <on>cinmcomp_orig.docid = gcomfacl.linid</on>

                        <join table='gcomfach'>
                            <on>gcomfacl.cabid = gcomfach.cabid</on>
                        </join>
                    </join>
                </join> -->

            </join>
        </from>
        <where>
            cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            AND cinmamor.fecfin BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
        </where>
        <group>1, 2, 3</group>
    </select>
`);

var mRsPle7_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            '${mIntYear}0000'   <alias name='campo1' />,
            'CUO0001'           <alias name='campo2' />,
            'MCUO0001'          <alias name='campo3' />,
            9                   <alias name='campo4' />,
            cinmelem.codele     <alias name='campo5' />,
            TO_CHAR(${mTmpTableActivos}.fecha, '%d/%m/%Y')                                  <alias name='campo6' />,
            CAST(ROUND(${mTmpTableActivos}.imp_usd, 2) AS VARCHAR(15))                      <alias name='campo7' />,
            CAST(ROUND(${mTmpTableActivos}.tip_cambio, 3) AS VARCHAR(5))                    <alias name='campo8' />,
            CAST(ROUND(${mTmpTableActivos}.imp_pen, 2) AS VARCHAR(15))                      <alias name='campo9' />,
            NVL( CAST(ROUND(${mNumTipCambio}, 3) AS VARCHAR(5)) , '0.000')                 <alias name='campo10' />,
            CAST(ROUND(${mTmpTableActivos}.ajuste, 2) AS VARCHAR(15))                       <alias name='campo11' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import, 2) AS VARCHAR(15)) , '0.00')        <alias name='campo12' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import_2, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo13' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import_3, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo14' />,
            1   <alias name='campo15' />,
            <whitespace/>
        </columns>
        <from table='cinmelem'>
            <join table='${mTmpTableActivos}'>
                <on>cinmelem.empcode = ${mTmpTableActivos}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTableActivos}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTableActivos}.codele</on>
            </join>
            <join table='cinmeval'>
                <on>cinmelem.empcode = cinmeval.empcode</on>
                <on>cinmelem.codinm  = cinmeval.codinm</on>
                <on>cinmelem.codele  = cinmeval.codele</on>
            </join>
        </from>
        <where>
            1=1
        </where>
    </select>
`); 

// return mRsPle7_3;

// Variables del nombre del archivo
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// Estructura de nombre del archivo txt de salida: LERRRRRRRRRRRAAAA000007030000OIM1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// Si la condición del reporte es Fichero (F)
if (pStrCondicion == 'F') { 

    // Definición del blob
    var blob = new Ax.sql.Blob(mStrNameFile);

    // Definición del archivo txt
    new Ax.rs.Writer(mRsPle7_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    }); 

    // Definición de file zip
    var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
    var zip = new Ax.util.zip.Zip(ficherozip); 

    zip.zipFile(blob);
    zip.close(); 

    // Definición blob del archivo zip
    var dst = new Ax.io.File(ficherozip.getAbsolutePath()); 
    var fichero = new Ax.sql.Blob(dst);

    // Definición ResultSet temporal
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

    return mRsFile;

    // Si la condición del reporte es Informe (I)
} else if (pStrCondicion == 'I') {
    return mRsPle7_3;
}
