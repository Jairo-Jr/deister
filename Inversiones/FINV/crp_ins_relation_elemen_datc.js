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
 *
 *  JS: crp_ins_relation_elemen_datc
 *      Version     : 1.1
 *      Date        : 25-05-2023
 *      Description : Registra en la tabla de apoyo 'crp_relation_elemen_datc'
 *                    los datos requeridos para la geneacion de partida de inversion.
 *
 *
 *  LOCAL FUNCTIONS:
 *  ==================
 *      ACTION:     ACTIION_69 - table-name: gcomfacl_datc
 *
 *  CALLED FROM:
 *  ==================
 *
 *
 *  PARAMETERS:
 *  ==================
 *      @param   {integer}   pIntLineaId        Identificador de la linea
 *      @param   {integer}   pIntDatContId      Identificador del dato contable
 *      @param   {integer}   pIntIdElemento     Identificaodr del elemento
 *      @param   {integer}   pIntCantidad       Cantidad de unidades a ser distribuido
 *      @param   {integer}   pFloatImporte      Importe a ser distribuido
 *
 **/
function crp_ins_relation_elemen_datc(pIntLineaId, pIntDatContId, pIntIdElemento, pIntCantidad, pFloatImporte) {

    function __validaCantidadImporte(pIntCantInput, pFloatImpInput) {

        // ===============================================================
        // Se valida que cantidad e importe, solo uno sea informado
        // ===============================================================
        if ( (pIntCantInput == 0 && pFloatImpInput == 0) || (pIntCantInput != 0 && pFloatImpInput != 0) ) {
            throw `Los campos CANTIDAD e IMPORTE, solo uno de ellos debe ser diferente de cero`;
        }

        // ===============================================================
        // Se valida que si se informa cantidad e importe, solo
        // se ingrese valores correspondientes al campo respectivo.
        // ===============================================================
        var mObjCantImporte = Ax.db.executeQuery(`
            <select first='1'>
                <columns>
                    datcontid,
                    linid,
                    cant,
                    import
                </columns>
                <from table='crp_relation_elemen_datc'/>
                    <where>
                        datcontid = ?
                        AND linid = ?
                    </where>
            </select>
        `, pIntDatContId, pIntLineaId).toOne();

        if(mObjCantImporte.cant == 0 && pIntCantidad != 0) {
            throw 'Se permite ingresar solo importes';
        }

        if(mObjCantImporte.import == 0) {
            if (pFloatImporte != 0) {
                throw 'Se permite ingresar solo cantidades';
            }
        }

    }

    try {
        Ax.db.beginWork();



        // TODO: Validar que si se informa cantidad o impote, solo se ingrese el valor informado


        // TODO: Validar que la cantidad e importe no supere a lo informado en la factura
        var mObjRelacionElemen = Ax.db.executeQuery(`
            <select>
                <columns>
                    datcontid,
                    linid,
                    SUM(cant) cant,
                    SUM(import) import
                </columns>
                <from table='crp_relation_elemen_datc'/>
                <where>
                    datcontid = ?
                    AND linid = ?
                </where>
                <group>1, 2</group>
            </select>
        `, pIntDatContId, pIntLineaId).toOne();

        if(mObjRelacionElemen.linid == null) {
            mObjRelacionElemen.cant = 0;
            mObjRelacionElemen.import = 0;
        }

        // Se calcula el acumulado de cantidad e importe
        var mIntCantAcumulado = mObjRelacionElemen.cant + pIntCantidad;
        var mIntImportAcumulado = mObjRelacionElemen.import + pFloatImporte;

        // Obtiene cantidad facturada e importe neto
        var mObjLinFac = Ax.db.executeQuery(`
            <select>
                <columns>
                    canfac,
                    impnet
                </columns>
                <from table='gcomfacl'/>
                <where>
                    linid = ?
                </where>
            </select>
        `, pIntLineaId).toOne();

        var mIntCantFac = mObjLinFac.canfac;
        var mIntImportFac = mObjLinFac.impnet;

        // TODO: Se calcula la diferencia de cantidad e importe
        var mIntDifCant = Ax.math.bc.sub(Math.abs(mIntCantFac), Math.abs(mIntCantAcumulado));
        var mIntDifImport = Ax.math.bc.sub(Math.abs(mIntImportFac), Math.abs(mIntImportAcumulado));

        if (mIntDifCant < 0 || mIntDifImport < 0) {
            throw `El acumulado de CANTIDAD e IMPORTE supera a lo informado en la factura. [${mIntDifCant}] - [${mIntDifImport}]`;
        }

        var mFloatPorcen = (pIntCantidad / mIntCantFac) * 100 + (pFloatImporte / mIntImportFac) * 100;

        Ax.db.execute(`
            INSERT INTO crp_relation_elemen_datc (datcontid, linid, cinmelem, cant, import, porcen) VALUES (?, ?, ?, ?, ?, ?);
        `, pIntDatContId, pIntLineaId, pIntIdElemento, pIntCantidad, pFloatImporte, mFloatPorcen);

        // Ax.db.insert('crp_relation_elemen_datc', {
        //     datcontid: pIntDatContId,
        //     linid: pIntLineaId,
        //     cinmelem: pIntIdElemento,
        //     cant: pIntCantidad,
        //     import: pFloatImporte
        // });

        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        throw new Ax.ext.Exception("ERROR: [${error}]", {error});
    }
}