var mEjercicio = 2024;
var mPeriodo = 2;

var mRs = Ax.db.executeQuery(`
    <select>
        <columns>
            capuntes.cuenta,
            ccuentas.nombre,

            NVL(SUM(CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                            (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN debe  ELSE 0 END),0)            <alias name='inideb' />,  <!-- Saldo inicial ingreso/divdeb -->
            NVL(SUM(CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                            (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN haber ELSE 0 END),0)             <alias name='inihab' />,  <!-- Saldo inicial egreso/divhab -->   
                                
            NVL(SUM(
                (
                    CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                            (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN debe  ELSE 0 END
                )-(
                    CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                            (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN haber ELSE 0 END
                )
            ), 0) ape,
            SUM(capuntes.debe) debe,
            SUM(capuntes.haber) haber,
            NVL(SUM(
                (
                    (
                        CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                                (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN debe  ELSE 0 END
                    )-(
                        CASE WHEN ('01-${mPeriodo}-${mEjercicio}' > capuntes.fecha OR
                                (capuntes.period = 0 AND capuntes.asient = 0 AND capuntes.fecha = '01-01-${mEjercicio}')) THEN haber ELSE 0 END
                    )
                )+(capuntes.debe)-(capuntes.haber)
            ),0) cierre
        </columns>
        <from table='capuntes'>
            <join type="left" table="ccuentas">
                <on>capuntes.placon = ccuentas.placon</on>
                <on>capuntes.cuenta = ccuentas.codigo</on>
            </join>
        </from>
        <where>
            capuntes.empcode = '125'
            AND capuntes.fecha &gt;= '01-01-${mEjercicio}'
            AND capuntes.fecha &lt; '01-${mPeriodo+1}-${mEjercicio}'
        </where>
        <group>1,2</group>
        <order>1</order>
    </select>
`);

return mRs;