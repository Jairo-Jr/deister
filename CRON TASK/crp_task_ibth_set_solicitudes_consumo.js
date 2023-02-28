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

 *  JS:  crp_task_ibth_send_solicitudes_consumo

 *  Version     : 1.0
 *  Date        : 28-02-2023
 *  Description : Función que filtra pedidos de consumo y los envía a IBTH 
 *                mediante el API desarrollado por ellos.
 *
 * 
 *
 *  CALLED FROM:
 *  ==================
 *          CRON TASK SCHEDULER -> 'crp_task_ibth_send_solicitudes_consumo' 
 *                                  Obtiene los pedidos de consumo validados para 
 *                                  enviarlos al API de IBTH (/SetOrders) 
 *                                  y posterior a dejar una marca de su envío.
 * 
 * 
 **/
 function crp_task_ibth_send_solicitudes_consumo() { 
    
    // ===============================================================
    // Declaración de variables
    // ===============================================================
    var mObjBodyOrders = {
        IdCustomer: 'id_cliente_ibth',
        Ordes: []
    };
    var mArrayOrderHeaders;
    var mArrayOrderLines;

    // ===============================================================
    // Se obtiene los pedidos de consumo (SVLC) validados, 
    // sin consumo total y no anulada.
    // Que serán enviadas a IBTH.
    // ===============================================================
    mArrayOrderHeaders = Ax.db.executeQuery(`
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
                gcomsolh.tipdoc = 'SVLC'                            <!-- Vale de consumo -->
            AND gcomsolh.estcab = 'V'                               <!-- Validada -->
            AND gcomsolh.estado NOT IN ('S','A')                    <!-- No debe estar: servida ni anulada  -->
            AND (gcomsolh.auxnum1 IS NULL OR gcomsolh.auxnum1 = 0)  <!-- No debe figurar como enviada  -->
        </where>
    </select>
    `).toJSONArray();
    // ===============================================================
    // CONSTRUCCIÓN DEL OBJETO CON PEDIDOS DE CONSUMO
    // ===============================================================

    // ===============================================================
    // Recorrido de los pedidos de consumo (a nivel de cabecera)
    // ===============================================================
    var mIntAux = 0;
    mArrayOrderHeaders.forEach(mObjOrderHeader => {
        console.log(mObjOrderHeader.cabid, ' - ', mObjOrderHeader.orderclient);
        // ===============================================================
        // Se agrega el pedido de consumo (cabecera) al objeto
        // ===============================================================
        mObjBodyOrders.Ordes.push(
            {
                OrderClient:    mObjOrderHeader.orderclient,
                OrderType:      mObjOrderHeader.ordertype,
                LabelDestino:   mObjOrderHeader.labeldestino,
                Referencia:     mObjOrderHeader.referencia,
                OrderItem:      []
            }
        )
    
        // ===============================================================
        // Se obtiene los artículos (líneas) asociados 
        // al pedido de consumo.
        // ===============================================================
        mArrayOrderLines = Ax.db.executeQuery(`
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
        `, mObjOrderHeader.cabid).toJSONArray();
    
        // ===============================================================
        // Recorrido de los artículos asociados al pedido de consumo, 
        // para agregarlos al objeto.
        // ===============================================================
        mArrayOrderLines.forEach(mObjOrderLine => { 
    
            // ===============================================================
            // Se agrega al objeto los articulos asociados al pedido de consumo
            // ===============================================================
            mObjBodyOrders.Ordes[mIntAux].OrderItem.push(
                {
                    LineId:     mObjOrderLine.linid,
                    Code:       mObjOrderLine.codart,
                    Qty:        mObjOrderLine.cansol
                }
            )
        });
    
        mIntAux++;
    });
    
    // ===============================================================
    // Se realiza una peticion Http al endpoint '/SetOrders'
    // =============================================================== 
    /**
     * 
     * HTTP REQUEST
     * 
     */

    // ===============================================================
    // Se deja una marca en 'auxnum1' para identificar 
    // que fue enviada a IBTH
    // =============================================================== 
    mArrayOrderHeaders.forEach(mObjOrderHeader => { 
        Ax.db.update(`gcomsolh`, 
            {
                auxnum1: '1'
            }, {
                cabid: mObjOrderHeader.cabid
            }
        );
    })
    
}  