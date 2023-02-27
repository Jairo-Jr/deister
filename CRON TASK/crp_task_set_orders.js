var objOrders = {
    IdCustomer: 'id_cliente_ibth',
    Ordes: []
};
var arrayLineas;

var arrayCabeceras = Ax.db.executeQuery(`
    <select>
    <columns>
        gcomsolh.docser     <alias name='orderclient' />,
        'PED'               <alias name='ordertype' />,
        cterdire.direcc     <alias name='labeldestino' />,
        gdelegac.nomdlg     <alias name='referencia' />,
        gcomsolh.cabid
    </columns>
    <from table='gcomsolh'>
        <join table='cterdire'>
            <on>gcomsolh.delega = cterdire.codigo</on>
            <on>gcomsolh.depart = cterdire.tipdir</on>
        </join>
        <join table='gdelegac'>
            <on>gcomsolh.delega = gdelegac.codigo</on>
        </join>
    </from>
    <where>
            gcomsolh.tipdoc = 'SVLC' <!-- Vale de consumo -->
        AND gcomsolh.estcab = 'V' <!-- Validada -->
        AND gcomsolh.estado NOT IN ('S','A') <!-- No debe estar: servida ni anulada  -->
        AND (gcomsolh.auxnum1 IS NULL OR gcomsolh.auxnum1 = 0) <!-- No debe figurar como enviada  -->
    </where>
</select>
`);
var orden = 0;
arrayCabeceras.forEach(item => {
    
    objOrders.Ordes.push(
        {
            OrderClient: item.orderclient,
            OrderType: item.ordertype,
            LabelDestino: item.labeldestino,
            Referencia: item.referencia,
            OrderItem: []
        }
    )

    arrayLineas = Ax.db.executeQuery(`
        <select>
            <columns>
                gcomsoll.linid,
                gcomsoll.codart,
                gcomsoll.cansol,
                gcomsoll.cabid
            </columns>
            <from table='gcomsoll'>
                <join table='gcomsolh'>
                    <on>gcomsoll.cabid = gcomsolh.cabid</on>
                </join>
            </from>
            <where>
                (gcomsoll.cansol - gcomsoll.canser) != 0
                AND gcomsoll.cabid = ?
            </where>
        </select>
    `, item.cabid);

    arrayLineas.forEach(itemLineas => {

        objOrders.Ordes[orden].OrderItem.push(
            {
                LineId: itemLineas.linid,
                Code: itemLineas.codart,
                Qty: itemLineas.cansol
            }
        )
    });

    orden++;
});

console.log(objOrders);
