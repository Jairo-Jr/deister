var sql = `
    <!-- Total: 364 -->

    <select intotemp='@tmp_tbl_cefectos'>
        <columns>
            capuntes.apteid,
            MAX(cefectos.fecven) fecven
        </columns>
        <from table='capuntes'>
            <join type='left' table='cefectos'>
                <on>capuntes.apteid = cefectos.apteid</on>
            </join>
        </from>
        <where>
            capuntes.fecha BETWEEN '01-04-2023' AND '09-04-2023'
        </where>
        <group>1</group>
    </select>

    <select>
        <columns>
            '20230400' <alias name='campo1' />,
            'CUO20230400' <alias name='campo2' />,
            'MCUO20230400' <alias name='campo3' />,
            capuntes.cuenta <alias name='campo4' />,
            capuntes.proyec <alias name='campo5' />,
            capuntes.seccio <alias name='campo6' />,
            capuntes.moneda <alias name='campo7' />,
            '' <alias name='campo8' />,
            ctax_move_head.taxh_cifter <alias name='campo9' />,
            ctax_move_head.taxh_auxchr4 <alias name='campo10' />,
            SUBSTR(ctax_move_head.taxh_refter, 1,CHARINDEX('-', ctax_move_head.taxh_refter)-1) <alias name='campo11' />,
            SUBSTR(ctax_move_head.taxh_refter,CHARINDEX('-', ctax_move_head.taxh_refter)+1) <alias name='campo12' />,
            capuntes.fecha <alias name='campo13' />,
            tmp_cefectos.fecven <alias name='campo14' />,
            ctax_move_head.taxh_fecdoc <alias name='campo15' />,
            capuntes.concep <alias name='campo16' />,
            '' <alias name='campo17' />,
            capuntes.debe <alias name='campo18' />,
            capuntes.haber <alias name='campo19' />,
            '' <alias name='campo20' />,
            '1' <alias name='campo21' />,
            <whitespace/>
        </columns>
        <from table='capuntes'>
            <join table='@tmp_tbl_cefectos' alias='tmp_cefectos'>
                <on>capuntes.apteid = tmp_cefectos.apteid</on>
            </join>

            <join table='ctax_move_head'>
                <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
            </join>
        </from>
        <where>
            ctax_move_head.taxh_fecdoc &lt;= '30-04-2023'
        </where>
    </select>
`;