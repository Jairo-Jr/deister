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
 *  JS:  crp_carga_extracto_scotia
 *
 *  Version     : v1.1
 *  Date        : 2023-10-10
 *  Description : Generación de extractos bancarios para cuentas BCP, a partir
 *                de la lectura de archivo Excel.
 *
 *
 *
 *  CALLED FROM:
 *
 *      Obj: textract_file        Atravez de la accion 'ACTION_BUTTON_163'
 *
 *
 *  PARAMETERS:
 *
 *      @param  {integer}   pIntFileId      Identificador de fichero
 *
 */
function crp_carga_extracto_scotia(pIntFileId) {

    /**
     * Definicion de variables
     */
    var mObjDivisa = {
        '01': 'PEN',
        '10': 'USD'
    }
    var mStrCodCtaFin = '';
    var mStrCodBan = '';
    var mFloatImporteExt = '';
    var mDateFecExtracto = '';
    var mStrNumCta = '';
    var mStrDivisa = '';
    var mFloatSaldoExt = 0;

    try {
        Ax.db.beginWork();


        /**
         * Captura del archivo Excel
         */
        let mFileBlobData = Ax.db.executeGet(`
            <select>
                <columns>
                    file_data
                </columns>
                <from table='textract_file'/>
                <where>
                    file_seqno = ?
                </where>
            </select>
        `, pIntFileId);

        /**
         * Conversion del fichero byte a string
         */
        var mFileTmp = Ax.io.File.createTempFile();
        mFileTmp.write(mFileBlobData);

        /**
         * readString() por sí solo genera error cuando el contenido no se encuentra
         * codificado con UTF-8, por lo que se especifica la codificación ISO-8859-1
         *
         *  - Se omitio la codificación por tildes en el archivo
         */
        var mArrText = mFileTmp.readString();
        mArrText = mArrText.replace(/\n$/, "");

        mArrText = mArrText.split(/\r\n|\n/);

        /**
         * Recorrido por lineas del archivo
         */
        var i=0;
        mArrText.forEach(mStrRow => {

            /**
             * Limpieza de espacios en blanco ubicados a la izquierda
             */
            mStrRow = mStrRow.trimLeft();

            /**
             * Construccion de datos
             */
            var mStrFecOpe = mStrRow.substring(16, 24); // Fecha de Operacion
            mStrFecOpe = mStrFecOpe.substring(6, 8) + '/' + mStrFecOpe.substring(4, 6) + '/' + mStrFecOpe.substring(0, 4); // Formato de fecha (DD/MM/YYYY)
            var mStrFecVal = mStrRow.substring(140, 148); // Fecha de Valor

            mStrFecVal = mStrFecVal.substring(6, 8) + '/' + mStrFecVal.substring(4, 6) + '/' + mStrFecVal.substring(0, 4); // Formato de fecha (DD/MM/YYYY)
            var mFloatImport = mStrRow.substring(45, 60).trim(); // Importe
            mFloatImport = parseFloat(mFloatImport);
            var mStrSigno = mStrRow.substring(60, 61).trim(); // Signo
            mFloatImport = mStrSigno + mFloatImport; // Concatena signo + importe
            var mStrConPro = mStrRow.substring(32, 35); // Concepto Propio
            // var mFloatSaldo = mStrRow.substring(110, 127).trim(); // Saldo

            var mStrRefer2 = mStrRow.substring(148).trim() // Referencia 2
            var mStrConcep = mStrRow.substring(83, 114).trim() // Descripción

            /**
             * Validación en la primera fila de:
             *  - Codigo de cuenta financiera
             *  - Fecha del extracto
             *  - Saldo del extracto
             */
            if (i == 0){

                mStrNumCta = mStrRow.substring(2, 14); // Numero de Cuenta
                mStrDivisa = mObjDivisa[mStrRow.substring(125, 127)]; // Divisa

                var mArrayCbancPro = Ax.db.executeQuery(`
                    <select>
                        <columns>
                            ctafin, codban, salext, fecext
                        </columns>
                        <from table='cbancpro'/>
                        <where>
                            bban = ?
                            AND moneda = ?
                            AND estado = 'A'
                            AND tipcta = 1
                        </where>
                    </select>
                `, mStrNumCta, mStrDivisa).toJSONArray();

                if(mArrayCbancPro.length == 0) {
                    throw `No existe una cuenta financiera con BBAN [${mStrNumCta}] y Moneda [${mStrDivisa}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
                } else if(mArrayCbancPro.length > 1) {
                    throw `Existe más de una cuenta financiera con BBAN [${mStrNumCta}] y Moneda [${mStrDivisa}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
                } else {
                    mStrCodCtaFin    = mArrayCbancPro[0].ctafin;
                    mStrCodBan       = mArrayCbancPro[0].codban;
                    // mFloatImporteExt = mArrayCbancPro[0].salext;
                    // mDateFecExtracto = mArrayCbancPro[0].fecext;
                }

                /**
                 * Validación de fecha y saldo del extracto
                 */
                // var mDateFechaInicio = new Ax.util.Date(mStrFecOpe);
                // if(mDateFecExtracto == null) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
                // var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

                // if(mDateCbancproFecExtracto.afterOrEqual(mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
                // if(mFloatSaldo != mFloatImporteExt) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mFloatSaldo}]`;}

            }

            var mObjTextract = {
                file_seqno: pIntFileId,
                fecope: mStrFecOpe,
                fecval: mStrFecVal,
                // refer1: mStrRefer1,//
                import: mFloatImport,
                refer2: mStrRefer2,//
                // docume: mRowSheet.G,//
                concep: mStrConcep,
                ctafin: mStrCodCtaFin,
                empcode: '125',
                codban: mStrCodBan,
                ccc1: mStrNumCta.substring(0,3),
                ccc2: mStrNumCta.substring(3,6),
                ctacte: mStrNumCta.substring(6),
                concom: '00',
                conpro: mStrConPro,
                divisa: mStrDivisa
            }
            i++
            /**
             * Captura del ultimo registro para Fecha y Saldo del extracto
             */
            // mFloatSaldoExt   = mFloatSaldo;
            // mDateFecExtracto = mStrFecOpe;

            /**
             * Registro del extracto bancario
             */
            Ax.db.insert("textract", mObjTextract);
        });

        /**
         * Se actualiza el estado del almacen de fichero (textract_file)
         */
        Ax.db.update("textract_file",
            {
                file_estado : 1
            },
            {
                file_seqno : pIntFileId
            }
        );

        /**
         * Se actualiza el saldo y fecha de la cuenta financiera (cbancpro)
         */
        // Ax.db.update("cbancpro",
        //     {
        //         salext : mFloatSaldoExt,
        //         fecext : mDateFecExtracto
        //     },
        //     {
        //         bban: mStrNumCta,
        //         moneda: mStrDivisa,
        //         estado: 'A',
        //         tipcta: 1
        //     }
        // );

        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        throw new Ax.ext.Exception(error);
    }


}