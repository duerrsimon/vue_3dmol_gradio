

const App = new Vue({
  el: '#app',
  components: {
  },
  data: {
    title: "",
    dynamic_para: "This sentence is generated dynamically.",
    selected_items: [],
    selectionMode: "single",
    ds: null,
    config: {
      backgroundColor: "white",
      orthographic: false,
      disableFog: false,
      hoverDuration: 0
    },
    settings: {
      backgroundColor: {
        type: "select",
        options: ["white", "black", "gray", "lightgray", "beige", "orange"],
      },
      orthographic: {
        type: "toggle",
      },
      disableFog: {
        type: "toggle",
      },
    },
    view: null,
    loaded: false,
    confidenceLabel: "pLDDT",
    moldata: [],
    labelHover: true,
    hover: false,
    anyColorAlphaFold: false,
    modelAlphaFold: {},
    representations: [{}],
    selectedRepresentations: [
    ],
    selectedAtoms: [],
    showOffCanvas: false,
    showOffCanvasReps: false,
    isAnimated: false,
    selectedAtom: null,
    currentChain: "A",
    currentModel: 0,
    showSequence: true,
    isovalue: 0.5,
    voldata: null,
    shape: null,
    labels: {
      "NA": "Sodium",
      "K": "Potassium",
      "MG": "Magnesium",
      "CA": "Calcium",
      "MG": "Magnesium",
      "ZN": "Zinc",
      "MN": "Manganese",
      "FE": "Iron",
      "CO": "Cobalt",
      "NI": "Nickel",
      "CU": "Copper",
    },
    aa_map: {
      "ALA": "A",
      "ARG": "R",
      "ASN": "N",
      "ASP": "D",
      "CYS": "C",
      "GLN": "Q",
      "GLU": "E",
      "GLY": "G",
      "HIS": "H",
      "ILE": "I",
      "LEU": "L",
      "LYS": "K",
      "MET": "M",
      "PHE": "F",
      "PRO": "P",
      "SER": "S",
      "THR": "T",
      "TRP": "W",
      "TYR": "Y",
      "VAL": "V",
    }


  },
  computed: {
    hasFrames() {
      let hF = false;
      this.moldata.forEach((element) => {
        if (element.asFrames) {
          hF = true;
        }
      });
      return hF
    },
    nModels() {
      return this.moldata.length
    },
    contigRep() {
      // Filter objects based on currentchain
      const filteredObjects = this.selectedAtoms.filter(obj => obj.chain === this.currentChain);

      //if no atoms selected in currentchain, return all

      if (filteredObjects.length == 0) {
        if (this.view != null) {
          let allIndexes = Object.values(this.zeroIndexedSeq[this.currentChain])
          return allIndexes[0] + "-" + allIndexes[allIndexes.length - 1]
        }
      }

      // Extract resi values from filtered objects
      const resiValues = filteredObjects.map(obj => parseInt(obj.resi, 10));

      // Sort the resi values
      resiValues.sort((a, b) => a - b);


      // Generate the range string
      let rangeString = "";
      if (this.view != null) {
        let startRange = this.zeroIndexedSeq[this.currentChain][resiValues[0]];
        let endRange = this.zeroIndexedSeq[this.currentChain][resiValues[0]];

        for (let i = 1; i < resiValues.length; i++) {
          if (this.zeroIndexedSeq[this.currentChain][resiValues[i]] === endRange + 1) {
            endRange = this.zeroIndexedSeq[this.currentChain][resiValues[i]];
          } else {
            if (startRange !== endRange) {
              rangeString += `${startRange}-${endRange},`;
            } else {
              rangeString += `${startRange},`;
            }
            startRange = this.zeroIndexedSeq[this.currentChain][resiValues[i]];
            endRange = this.zeroIndexedSeq[this.currentChain][resiValues[i]];
          }
        }

        if (startRange !== endRange) {
          rangeString += `${startRange}-${endRange}`;
        } else {
          rangeString += `${startRange}`;
        }
      }

      return rangeString;
    },
    modelChains() {
      if (this.view != null) {
        let chains = []
        this.view.getModel(this.currentModel).atoms.forEach((atom) => {
          if (!chains.includes(atom.chain)) {
            chains.push(atom.chain)
          }

        })
        return chains
      }
    },
    mergedrepresentations() {
      if (this.loaded) {
        return this.representations.concat(this.selectedRepresentations)
      }
      return {}
    },
    seq() {

      let seq = {}

      if (this.view != null) {
        for (let i = 0; i < this.nModels; i++) {

          seq[i] = {}
          this.view.getModel(i).atoms.forEach((atom) => {
            seq[i][atom.chain] = {}
          })

          this.view.getModel(i).atoms.forEach((atom) => {
            seq[i][atom.chain][atom.resi] = atom.resn
          })
        }
      }
      return seq
    },
    zeroIndexedSeq() {
      //iterate over current model in seq and get continous zero indexed mapping from resids to index
      let zeroIndexedSeq = {}
      if (this.view != null) {
        let index = 0
        Object.keys(this.seq[this.currentModel]).forEach((chain) => {
          zeroIndexedSeq[chain] = {}
          Object.keys(this.seq[this.currentModel][chain]).forEach((resid) => {
            if (this.aa_map[this.seq[this.currentModel][chain][resid]] != undefined) {
              zeroIndexedSeq[chain][resid] = index
              index += 1
            }
          })
        }
        )
      }
      return zeroIndexedSeq
    },
    sequence() {
      if (this.view != null) {
        //use current chain to render sequence as array of 10s with mapping to single letters
        let seqArray = []
        let tempArray = []
        Object.keys(this.seq[this.currentModel][this.currentChain]).forEach((index) => {
          residue = this.seq[this.currentModel][this.currentChain][index]
          let key = ""
          if (this.aa_map[residue] === undefined) {
            key = residue
          } else {
            key = this.aa_map[residue]
          }
          if (key != "HOH") {
            tempArray.push({ "resi": index, "resn": key })
          }

          if (tempArray.length === 10) {
            seqArray.push(tempArray)
            tempArray = []
          }
        })
        //add last array
        seqArray.push(tempArray)
        if (this.ds != null) {
          this.ds.setSettings({
            selectables: document.getElementsByClassName('item-selectable'),
          })
        }

        return seqArray

      }
      return ""


    }
  },
  watch: {
    mergedrepresentations: {
      handler(newVal, oldVal) {
        this.applyStyles(newVal)
        this.triggerAlphaFold()


      },
      deep: true,
    },
    config: {
      handler(newVal, oldVal) {
        this.view.setBackgroundColor(newVal.backgroundColor);
        this.view.enableFog(!newVal.disableFog);
        this.view.setCameraParameters({ orthographic: newVal.orthographic });
      },
      deep: true
    }
  },
  methods: {
    getMoldata() {
      this.moldata = JSON.parse(document.getElementById("moldata").textContent)['moldata'];
    },
    getRepresentations() {
      this.representations = JSON.parse(document.getElementById("representations").textContent);
    },
    isSelected(model, chain, resi) {
      // if (this.selectedAtom != null){
      //   if (this.selectedAtom.resi === resi && this.selectedAtom.chain === chain && this.selectedAtom.model === model){
      //     return true
      //   }
      // }
      // return false

      //check if model, chain, resi are in selectedAtoms

      let found = false
      this.selectedAtoms.forEach((atom) => {
        if (atom.model === model && atom.chain === chain && atom.resi === resi) {
          found = true
        }
      })
      return found
    },
    toggleRepresentation(model, close_residues) {
      //checke what chains we have
      let chains = {}
      close_residues.forEach((residue) => {
        if (Object.keys(chains).includes(residue.chain)) {
          chains[residue.chain].push(residue.resi)
        } else {
          chains[residue.chain] = [residue.resi]
        }
      })
      //check if we have a representation for each chain
      Object.keys(chains).forEach((chain) => {
        let found = false
        this.representations.forEach((representation) => {
          if (representation.chain === chain && representation.model === model && representation.residue_range === chains[chain]) {
            found = true
          }
        })
        if (!found) {
          // join residues using comma
          let residue_range = chains[chain].join(",")
          this.representations.push({
            "model": model,
            "chain": chain,
            "resname": "",
            "color": "whiteCarbon",
            "style": "stick",
            "residue_range": residue_range,
            "visible": false,
            "byres": false
          })
        }
      })


    },
    selectAtom(model, chain, resi) {
      // alert("clicked")
      this.selectedAtom = { "model": model, "chain": chain, "resi": resi }
      if (this.moldata[model].selectionStyle.multiple) {

        //check if already selected
        let found = this.isSelected(model, chain, resi)
        if (found) {
          //remove from selectedAtoms
          this.selectedAtoms = this.selectedAtoms.filter((atom) => {
            return !(atom.model === model && atom.chain === chain && atom.resi === resi)
          })
          this.selectedRepresentations = this.selectedRepresentations.filter((representation) => {
            return !(representation.model === model && representation.chain === chain && representation.residue_range === resi)
          })
        } else {

          this.selectedAtoms.push({ "model": model, "chain": chain, "resi": resi })
          this.selectedRepresentations.push({
            model: model,
            chain: chain,
            resname: "",
            style: this.moldata[model].selectionStyle.representation,
            color: this.moldata[model].selectionStyle.color,
            residue_range: resi,
            around: 0,
            byres: false,
            visible: true,
          })
        }
      } else {
        this.selectedAtoms = [{ "model": model, "chain": chain, "resi": resi }]
        this.selectedRepresentations = [{
          model: model,
          chain: chain,
          resname: "",
          style: this.moldata[model].selectionStyle.representation,
          color: this.moldata[model].selectionStyle.color,
          residue_range: resi,
          around: 0,
          byres: false,
          visible: true,
        }]
      }



    },
    triggerAlphaFold() {
      let anyColorAlphaFold = false;
      let MAF = {}
      this.representations.forEach((rep) => {
        if (rep.color === "alphafold") {
          anyColorAlphaFold = true
          MAF[rep.model] = true
        } else {
          if (!Object.keys(MAF).includes(rep.model)) {
            MAF[rep.model] = false
          }

        }
      });
      this.anyColorAlphaFold = anyColorAlphaFold;
      this.modelAlphaFold = MAF
    },
    toggleAnimation() {
      if (this.isAnimated) {
        this.view.pauseAnimate();
      } else {
        this.view.animate({ loop: "forward", reps: 0 });
      }
      this.view.render();
      this.isAnimated = !this.isAnimated;
    },
    colorAlpha(atom) {
      if (atom.b < 50) {
        return "OrangeRed";
      } else if (atom.b < 70) {
        return "Gold";
      } else if (atom.b < 90) {
        return "MediumTurquoise";
      } else {
        return "Blue";
      }
    },
    deleteRep(index) {
      this.representations.splice(index, 1);
      this.applyStyles(this.representations)

    },
    insertRep() {
      this.representations.push({
        model: 0,
        chain: "",
        resname: "",
        style: "cartoon",
        color: "grayCarbon",
        residue_range: "",
        around: 0,
        byres: false,
        visible: true,
      })
    },
    resetZoom(rep) {
      // if is not pointerevent
      if (rep.type != undefined) {
        this.view.zoomTo();
      } else {
        let sel = {
          model: rep.model,
        };
        if (rep.chain !== "") {
          sel.chain = rep.chain;
        }
        if (rep.residue_range !== "") {
          if (typeof (rep.residue_range) === 'string') {

            //split based on commas
            let resis = rep.residue_range
            resis = resis.split(",")
            sel.resi = resis;
          } else {
            sel.resi = rep.residue_range;
          }

          sel.resi = rep.residue_range;
        }
        if (rep.resname !== "") {
          sel.resn = rep.resname;
        }
        this.view.zoomTo(sel);
      }
    },
    applyStyles(representations) {
      if (this.view !== undefined) {
        this.view.setStyle();
        this.view.removeAllSurfaces();
        representations.forEach((rep) => {
          let colorObj;

          if (rep.color === "alphafold") {
            colorObj = { colorfunc: this.colorAlpha };
          } else if (rep.color == "spectrum") {
            colorObj = { color: "spectrum" };
          } else {
            colorObj = { colorscheme: rep.color };
          }
          let selObj = { model: rep.model };
          if (rep.chain !== "") {
            selObj.chain = rep.chain;
          }
          if (rep.residue_range !== "") {
            // if is a string containing commas

            if (typeof (rep.residue_range) === 'string') {

              //split based on commas
              let resis = rep.residue_range
              resis = resis.split(",")
              selObj.resi = resis;
            } else {
              selObj.resi = rep.residue_range;
            }


          }
          if (rep.resname !== "") {
            selObj.resn = rep.resname;
          }
          selObj.byres = rep.byres;
          if (rep.around !== 0) {
            selObj.expand = rep.around;
          }
          if (rep.sidechain) {
            selObj = {
              and: [selObj, { atom: ["N", "C", "O"], invert: true }],
            };
          }
          if (rep.style === "surface") {
            colorObj.opacity = 0.8;
            this.view.addSurface($3Dmol.SurfaceType.VDW, colorObj, selObj);
          } else if (rep.style === "sphere") {
            this.view.addStyle(selObj, {
              "sphere": { 'color': rep.color.replace("Carbon", "") },
            });
          } else {
            this.view.addStyle(selObj, {
              [rep.style]: colorObj,
            });
          }

        });

        this.view.render();
      }
    }
  },
  updated() {
    if (this.loaded) {
      this.ds.setSettings({
        selectables: document.getElementsByClassName('item-selectable'),
      })
      //parent0 is for nested iframes, window top for all other cases
      console.log("sending message")
      try {
          window.top[0].postMessage(this.contigRep, '*')
      } catch (error) {
        console.log("window.top[0] not defined");
      }
      try {
          window.top[1].postMessage(this.contigRep, '*')
      } catch (error) {
        console.log("window.top[1] not defined");
      }
      window.top.postMessage(this.contigRep, '*')
    }
  },
  async mounted() {
    await this.getMoldata()
    await this.getRepresentations()
    this.loaded = true;
    this.ds = new DragSelect({
      selectables: document.querySelectorAll('.item-selectable'),
      multiSelectMode: false,
      multiSelectToggling: false,
      area: this.$refs.selectableArea,
      // draggability: false
    });
    var that = this;
    this.ds.subscribe('callback', (e) => {
      console.log(e.items)

      e.items.map((item) => {
        that.selectAtom(parseInt(item.dataset.currentmodel), item.dataset.currentchain, item.dataset.currentresi)
      })
    });
    // let element = document.querySelector('#viewer-container');
    let startingConfig = { ...this.config, cartoonQuality: 7 };
    this.view = $3Dmol.createViewer(this.$refs.viewer, startingConfig);
    // this.view.addSphere({ center: {x:0, y:0, z:0}, radius: 10.0, color: 'green' });
    this.moldata.forEach((element, index) => {

      if (element.asFrames) {
        this.view.addModelsAsFrames(element.data, element.format);
      } else {
        this.view.addModel(element.data, element.format);
      }
      let that = this;
      if (element.clickable) {
        //click callback
        this.view.getModel(index).setClickable({}, true, function (atom, viewer, event, container) {
          that.selectedAtom = { "model": index, "chain": atom.chain, "resi": atom.resi }
        });
      }
    });
    //trigger computation which model contains plddts
    // this.representations = this.representations;
    this.applyStyles(this.representations);
    this.triggerAlphaFold();

    if (this.labelHover) {
      let that = this;
      this.view.setHoverable(
        {},
        true,
        function (atom, view, event, container) {
          if (!atom.label) {
            let label;
            if (that.moldata[atom.model].clickable) {
              that.hover = true;
            }

            if (that.modelAlphaFold[atom.model]) {
              label =
                atom.resn +
                ":" +
                atom.resi +
                ":" +
                atom.atom +
                " (" +
                that.confidenceLabel +
                " " +
                atom.b +
                ")";
            } else {
              label =
                atom.resn + ":" + atom.resi + ":" + atom.atom;
            }
            if (that.labelHover) {
              atom.label = view.addLabel(label, {
                position: atom,
                backgroundColor: "#ffffff",
                borderColor: "#dddddd",
                fontColor: "black",
              });
            }



          }
        },
        function (atom, view) {
          if (atom.label) {
            that.hover = false;
            view.removeLabel(atom.label);
            // view.setStyle({resi:atom.resi}, {});
            delete atom.label;
          }
        }
      );
    };

    this.view.zoomTo();
    this.view.render();

  }
})


