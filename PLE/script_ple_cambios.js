var mIntYear = 2023;

// Obtencion del tipo de cambio
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

let mTmpTableUnion = Ax.db.getTempTableName(`tmp_table_union_cinmelem`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableUnion}`);

var resSQL = Ax.db.execute(`
    <union type='all' intotemp = '${mTmpTableUnion}'>

        <select>
            <columns>
                '${mIntYear}0000'   <alias name='campo1' />,
                'CUO0001'           <alias name='campo2' />,
                'MCUO0001'          <alias name='campo3' />,
                9                   <alias name='campo4' />,
                cinmelem.codele     <alias name='campo5' />,
                TO_CHAR(MAX(cinmcomp.fecfac), '%d/%m/%Y')        <alias name='campo6' />,
                '0.00'             <alias name='campo7' />,
                '0.00'              <alias name='campo8' />,
                '0.00'                          <alias name='campo9' />,
                NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')         <alias name='campo10' />,
                CAST(ROUND(0.00, 2) AS VARCHAR(15))     <alias name='campo11' />,
                0.00      <alias name='campo12' />,
                0.00    <alias name='campo13' />,
                SUM(cinmamor.import)    <alias name='campo14' />,
                1   <alias name='campo15' />,

                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele
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

                </join>
            </from>
            <where>
                cinmhead.estcom = 'A'
                AND cinmcomp.tipcom NOT IN ('I', 'A')
                AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            </where>
            <group>1, 2, 3, 4, 5, 16, 17, 18</group>
        </select>

        <select>
            <columns>
                '${mIntYear}0000'   <alias name='campo1' />,
                'CUO0001'           <alias name='campo2' />,
                'MCUO0001'          <alias name='campo3' />,
                9                   <alias name='campo4' />,
                cinmelem.codele     <alias name='campo5' />,
                TO_CHAR(MAX(cinmcomp.fecfac), '%d/%m/%Y')        <alias name='campo6' />,
                '0.00'             <alias name='campo7' />,
                '0.00'              <alias name='campo8' />,
                '0.00'                          <alias name='campo9' />,
                NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')         <alias name='campo10' />,
                CAST(ROUND(0.00, 2) AS VARCHAR(15))     <alias name='campo11' />,
                0.00      <alias name='campo12' />,
                SUM(cinmamor.import)    <alias name='campo13' />,
                0.00    <alias name='campo14' />,
                1   <alias name='campo15' />,

                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele
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

                </join>
            </from>
            <where>
                cinmcomp.fecbaj IS NOT NULL
                AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            </where>
            <group>1, 2, 3, 4, 5, 16, 17, 18</group>
        </select>

        <select>
            <columns>
                '${mIntYear}0000'   <alias name='campo1' />,
                'CUO0001'           <alias name='campo2' />,
                'MCUO0001'          <alias name='campo3' />,
                9                   <alias name='campo4' />,
                cinmelem.codele     <alias name='campo5' />,
                TO_CHAR(MAX(cinmcomp.fecfac), '%d/%m/%Y')        <alias name='campo6' />,
                '0.00'             <alias name='campo7' />,
                '0.00'              <alias name='campo8' />,
                '0.00'                          <alias name='campo9' />,
                NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')         <alias name='campo10' />,
                CAST(ROUND(0.00, 2) AS VARCHAR(15))     <alias name='campo11' />,
                SUM(cinmamor.import)      <alias name='campo12' />,
                0.00    <alias name='campo13' />,
                0.00    <alias name='campo14' />,
                1   <alias name='campo15' />,

                cinmelem.empcode,
                cinmelem.codinm,
                cinmelem.codele
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

                </join>
            </from>
            <where>
                cinmhead.estcom = 'A'
                AND cinmcomp.tipcom IN ('I', 'A')
                AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            </where>
            <group>1, 2, 3, 4, 5, 16, 17, 18</group>
        </select>

    </union>
`);

var mQueryRes = Ax.db.executeQuery(`
    <select>
        <columns>
            campo1,
            campo2,
            campo3,
            campo4,
            campo5,
            campo6,
            campo7,
            campo8,
            CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15)) campo9,
            campo10,
            campo11,
            NVL( CAST(ROUND(SUM(campo12), 2) AS VARCHAR(15)) , '0.00') campo12,
            NVL( CAST(ROUND(SUM(campo13), 2) AS VARCHAR(15)) , '0.00') campo13,
            NVL( CAST(ROUND(SUM(campo14), 2) AS VARCHAR(15)) , '0.00') campo14,
            campo15
        </columns>
        <from table='${mTmpTableUnion}'>
            <join table='cinmeval'>
                <on>${mTmpTableUnion}.empcode = cinmeval.empcode</on>
                <on>${mTmpTableUnion}.codinm  = cinmeval.codinm</on>
                <on>${mTmpTableUnion}.codele  = cinmeval.codele</on>
            </join>
        </from>
        <group>1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15</group>
    </select>
`);

return mQueryRes;