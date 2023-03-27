var pStrCondicion = Ax.context.variable.TIPO;
var mIntYear = Ax.context.variable.YEAR;

var mDecTipoCambio = Ax.db.executeGet(`
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

let mTmpTable = Ax.db.getTempTableName(`tmp_cinmcomp_fecha`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);

Ax.db.execute(`
    <select intotemp='${mTmpTable}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele, 
            MAX(cinmcomp.fecfac) fecfac,
            SUM(cinmamor.porcen) porcen

        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

            </join>
        </from>
        <where>
            <!-- 1=1 -->
            EXISTS (SELECT cinmhead.estcom 
                    FROM cinmhead 
                    WHERE cinmhead.empcode = cinmcomp.empcode 
                            AND cinmhead.codinm = cinmcomp.codinm
                            AND cinmhead.estcom = 'A')
            AND cinmcomp.tipcom IN ('I', 'A')
            <!-- AND cinmamor.fecfin &lt;= '31-12-2024' -->
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
            TO_CHAR(${mTmpTable}.fecfac, '%d/%m/%Y')        <alias name='campo6' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))             <alias name='campo7' />,
            CAST(ROUND(0.00, 3) AS VARCHAR(5))              <alias name='campo8' />,
            CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15))  <alias name='campo9' />,
            NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')     <alias name='campo10' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))                                 <alias name='campo11' />,
            NVL( CAST(ROUND(${mTmpTable}.porcen, 2) AS VARCHAR(15)) , '0.00')   <alias name='campo12' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))             <alias name='campo13' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))             <alias name='campo14' />,
            1   <alias name='campo15' />,
            <whitespace/>
        </columns>
        <from table='cinmelem'>
            <join table='${mTmpTable}'>
                <on>cinmelem.empcode = ${mTmpTable}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTable}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTable}.codele</on>
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

return mRsPle7_3;

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
