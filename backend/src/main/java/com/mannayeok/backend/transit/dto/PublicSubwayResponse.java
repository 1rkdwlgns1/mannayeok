package com.mannayeok.backend.transit.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PublicSubwayResponse(
    Header header,
    Body body
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Header(String resultCode, String resultMsg) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Body(
        int totalDstc,
        int totalReqHr,
        int totalCardCrg,
        int trsitNmtm,
        List<TransferStation> trfstnNms,
        List<Path> paths
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TransferStation(
        String stnNm,
        String dptreLineNm,
        String arvlLineNm
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Path(
        Station dptreStn,
        Station arvlStn,
        int reqHr,
        int wtngHr,
        String trsitYn
    ) {
        public boolean isTransfer() {
            return "Y".equalsIgnoreCase(trsitYn);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Station(
        String stnCd,
        String stnNm,
        String lineNm,
        String brlnNm
    ) {
    }
}
