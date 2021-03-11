import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical, mdiPlus } from "@mdi/js";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import relativeTime from "../../../src/common/datetime/relative_time";
import { HASSDomEvent } from "../../../src/common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../src/components/data-table/ha-data-table";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-fab";
import {
  fetchHassioSnapshots,
  HassioSnapshot,
  reloadHassioSnapshots,
} from "../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { showHassioSnapshotDialog } from "../dialogs/snapshot/show-dialog-hassio-snapshot";
import { showSnapshotUploadDialog } from "../dialogs/snapshot/show-dialog-snapshot-upload";
import { supervisorTabs } from "../hassio-tabs";

@customElement("hassio-snapshots-table")
export class HassioSnapshotsTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor?: Supervisor;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ attribute: false }) public _snapshots: HassioSnapshot[] = [];

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this.refreshData();
    }
  }

  public async refreshData() {
    await reloadHassioSnapshots(this.hass);
    await this._fetchSnapshots();
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.refreshData();
    }
    this._firstUpdatedCalled = true;
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer => {
      const collums: Record<string, any> = {
        name: {
          title: this.supervisor?.localize("snapshot.name"),
          sortable: true,
          filterable: true,
          grows: true,
        },
      };
      if (!narrow) {
        collums.date = {
          title: this.supervisor?.localize("snapshot.created"),
          width: "15%",
          direction: "desc",
          sortable: true,
          template: (entry: string) => {
            return relativeTime(new Date(entry), this.hass.localize);
          },
        };
        collums.type = {
          title: this.supervisor?.localize("snapshot.type"),
          width: "15%",
          sortable: true,
          template: (entry: string) => {
            return entry === "partial" ? "Partial" : "Full";
          },
        };
      }
      return collums;
    }
  );

  protected render(): TemplateResult {
    if (!this.supervisor) {
      return html``;
    }
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${supervisorTabs}
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._snapshots}
        id="slug"
        @row-click=${this._handleRowClicked}
        clickable
        hasFab
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            ${this.supervisor?.localize("common.reload")}
          </mwc-list-item>
          ${atLeastVersion(this.hass.config.version, 0, 116)
            ? html`<mwc-list-item>
                ${this.supervisor?.localize("snapshot.upload_snapshot")}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>
        <ha-fab
          slot="fab"
          @click=${this._createSnapshot}
          .label=${this.supervisor.localize("snapshot.create_snapshot")}
          extended
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this.refreshData();
        break;
      case 1:
        this._showUploadSnapshotDialog();
        break;
    }
  }

  private _showUploadSnapshotDialog() {
    showSnapshotUploadDialog(this, {
      showSnapshot: (slug: string) =>
        showHassioSnapshotDialog(this, {
          slug,
          supervisor: this.supervisor,
          onDelete: () => this._fetchSnapshots(),
        }),
      reloadSnapshot: () => this.refreshData(),
    });
  }

  private async _fetchSnapshots() {
    await reloadHassioSnapshots(this.hass);
    this._snapshots = await fetchHassioSnapshots(this.hass);
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const slug = ev.detail.id;
    showHassioSnapshotDialog(this, {
      slug,
      supervisor: this.supervisor,
      onDelete: () => this._fetchSnapshots(),
    });
  }

  private _createSnapshot() {
    // add stuff
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-snapshots-table": HassioSnapshotsTable;
  }
}
