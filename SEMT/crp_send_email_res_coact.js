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
 *  JS:  crp_send_email_res_coact
 *  Version     : v1.0
 *  Date        : 26-07-2023
 *  Description : Envía por email información con la resolución coactiva al proveedor.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_embargo_telematico_respuesta              A través de la acción 'ACTION_81'
 *
 *  PARAMETERS:
 *  ==================
 *                @param    {integer}   pObjData        Objeto con informacion de data
 *
 *                @param    {object}    pObjField       Objeto con informacion de field
 *                                                      String      codpar      Codigo de la partida de destino
 *                                                      String      codele      Codigo del elemento de destino
 *
 **/
function crp_send_email_res_coact(pObjData, pObjField) {

    var mArrPagosRC = Ax.db.executeCachedQuery(`
        <select>
            <columns> 
                nmr_envio,
                nmr_operacion,
                ruc_tercer,
                razon,
                fec_registro,
                monto_pagar,
                desc_estado,
                res_coactiva
            </columns>
            <from table='crp_registro_semt' />
            <where>
                <!-- Con deuda -->
                estado_reg = 1
                AND desc_estado = 'Tiene deuda.'

                <!-- Resolucion coactiva emitida -->
                AND res_coactiva IS NOT NULL
                AND import_pagar IS NOT NULL

                <!-- Observacion levantada -->
                AND observado = 1

                AND crp_registro_semt.file_seqno = 15
            </where>
        </select>
    `);

    console.log(mArrPagosRC);
}

var pObjData = '';
var pObjField = '';
crp_send_email_res_coact(pObjData, pObjField);