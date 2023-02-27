/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART. 
 *
 * -----------------------------------------------------------------------------
 * 

 *  JS:  crp_task_solicitudes_consumo

 *  Version     : Version
 *  Date        : 17-02-2022
 *  Description : Describe lo que hace la funcion
 *
 *
 *  LOCAL FUNCTIONS:
 *  ==================
 *
 *
 *  CALLED FROM:
 *  ==================
 *
 *
 *  PARAMETERS:
 *  ==================
 *
 *
 **/
function crp_task_ibth_set_solicitudes_consumo() { 
    
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
    
}

