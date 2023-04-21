var query = `
    <select>
        <columns>
            '20230200' <alias name='campo1' />,
            'CUO20230200' <alias name='campo2' />,
            'ACUO20230200' <alias name='campo3' />,
            csaldos.cuenta <alias name='campo4' />,
            csaldos.proyec <alias name='campo5' />,
            csaldos.seccio <alias name='campo6' />,
            csaldos.moneda <alias name='campo7' />,
            '6' <alias name='campo8' />,
            ctax_move_head.taxh_cifter <alias name='campo9' />,
            ctax_move_head.taxh_auxchr4 <alias name='campo10' />,
            ctax_move_head.taxh_refter <alias name='campo11' />,
            ctax_move_head.taxh_refter <alias name='campo12' />,
            capuntes.fecha <alias name='campo13' />,
            cefectos.fecven <alias name='campo14' />,
            ctax_move_head.taxh_fecdoc <alias name='campo15' />,
            capuntes.concep <alias name='campo16' />,
            '' <alias name='campo17' />,
            capuntes.debe <alias name='campo18' />,
            capuntes.haber <alias name='campo19' />,
            '' <alias name='campo20' />,
            '1' <alias name='campo21' />
            <!-- COUNT(*) -->
        </columns>
        <from table='csaldos'>
            <join table="cperiodo">
                <on>csaldos.empcode = cperiodo.empcode</on>
                <on>csaldos.ejerci = cperiodo.ejerci</on>
                <on>csaldos.period = cperiodo.codigo</on>

                <join table='capuntes'>
                    <on>capuntes.empcode = csaldos.empcode</on>
                    <on>capuntes.cuenta  = csaldos.cuenta</on>
                    <on>NVL(capuntes.codaux,0)  = csaldos.codaux</on>
                    <on>NVL(capuntes.ctaaux,0)  = csaldos.ctaaux</on>
                    <on>capuntes.moneda  = csaldos.moneda</on>
                    <on>capuntes.proyec  = csaldos.proyec</on>
                    <on>capuntes.seccio  = csaldos.seccio</on>
                    <on>capuntes.sistem  = csaldos.sistem</on>
                    <!-- <on>capuntes.fecha   BETWEEN cperiodo.fecini AND cperiodo.fecfin</on> -->
                    <on>capuntes.fecha   BETWEEN '01/02/2023' AND '02/02/2023'</on>

                    <join type='left' table="cefectos">
                        <on>capuntes.apteid = cefectos.apteid</on>
                    </join>

                    <join type='left' table="ctax_move_head">
                        <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                    </join>

                </join>

            </join>
        </from>
        <where>
            1=1
            AND ( cperiodo.fecini = '01/02/2023' AND cperiodo.fecfin = '28/02/2023' )
        </where>
        <!-- <group>1,2,3,4,5</group> -->
    </select> 
`;

// Limitar la cantidad de datos por la fecha de capuntes
// por el momento para tener control