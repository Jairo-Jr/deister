var query = `
    <select>
        <columns>
            capuntes.apteid,
            csaldos.empcode,
            csaldos.cuenta,
            csaldos.codaux,
            csaldos.ctaaux,
            csaldos.moneda,
            csaldos.proyec,
            csaldos.seccio,
            csaldos.sistem,
            cperiodo.fecini,
            cperiodo.fecfin
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
                    <on>capuntes.fecha   BETWEEN cperiodo.fecini AND cperiodo.fecfin</on>
                </join>

            </join>

            
        </from>
        <where>
            1=1
            <!-- AND  -->
        </where>
        <!-- <group>1,2,3,4,5</group> -->
    </select> 
`;