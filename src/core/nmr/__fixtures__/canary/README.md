# SIMPSON Rotation Sense Validation (Canary 03a/03b)

This test validates whether SIMPSON interprets Euler angles as passive ZYZ rotations
(as claimed by Soprano) or active rotations.

## Experiment Configuration

- Nucleus: single ¹³C
- δ_iso = 0 ppm
- ζ = +300 ppm
- η = 0.5
- Proton frequency: 400 MHz (1 ppm ≈ 100.601532 Hz for ¹³C)
- `crystal_file alpha0beta0` (single crystal)

Haeberlen shift eigenvalues:
- δ_xx = -225 ppm (-22,635.3 Hz)
- δ_yy = -75 ppm (-7,545.1 Hz)
- δ_zz = +300 ppm (+30,180.5 Hz)

## Candidates

- **Candidate A** (Soprano passive output for β=90°, γ=90°):
  `shift 1 0.0p 300.0p 0.5 90.0 90.0 0.0`
- **Candidate B** (active interpretation):
  `shift 1 0.0p 300.0p 0.5 0.0 90.0 90.0`

## Results

Run using SIMPSON binary (`simpson`):
- `candidate_A` (sim_A): peak at **-7,568.36 Hz (-75.23 ppm)** -> matches δ_yy (-75 ppm)
- `candidate_B` (sim_B): peak at **-22,644.00 Hz (-225.09 ppm)** -> matches δ_xx (-225 ppm)

Difference between peaks: 150 ppm (15,075.64 Hz).

## Conclusion

SIMPSON reads `shift` Euler angles as **passive ZYZ in degrees**.
Soprano's convention is **correct**.
Proceed as designed with passive ZYZ Euler angles in degrees for SIMPSON export.
