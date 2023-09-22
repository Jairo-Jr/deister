function crp_generar_traspaso() {

    /**
     * Obtener datos de remesa
     */
    var mObjDataRemesa = Ax.db.executeQuery(`
        <select>
            <columns>
                cremesas.coment descri,
                'TEMP' tipdoc,
                cremesas.fecrem fecope,
                cremesas.fecrem fecval,
                cremesas.empcode empcode1,
                cremesas.empcode empcode2,
                cremesas.ctafin ctafin1,
                'BNACCC2842' ctafin2,
                cremesas.imptot impdiv,
                cremesas.imptot import
            </columns>
            <from table='cremesas' />
            <where>
                cremesas.numrem = 249
            </where>
        </select>
    `).toOne();

    /**
     * Se crea el traspaso
     */
    var mIntSerial = Ax.db.insert('ttramovh', mObjDataRemesa).getSerial();

    console.log('ID', mIntSerial);
}

crp_generar_traspaso();