/**
 * Holding a cached accessory that has no live services.
 *
 * Homebridge hands cached accessories back before discovery runs, with every
 * service and characteristic restored but no handlers on them. HAP accepts a
 * write to a characteristic with no handler and stores the value, so an
 * accessory that is not set up yet would report every tap as done.
 */

import type { API, PlatformAccessory } from "homebridge";

/**
 * Make every write to `accessory` fail, and every read fail while
 * `unreachable()` is true (HomeKit shows "No Response"); otherwise a read
 * returns the last-known value. Returns a function that removes the handlers
 * again, to be called before the accessory's live services are built.
 */
export function holdAccessory(
  api: API,
  accessory: PlatformAccessory,
  unreachable: () => boolean,
): () => void {
  const { Service, HapStatusError, HAPStatus } = api.hap;
  const held = accessory.services
    // Identify and the information fields are answered by HAP itself.
    .filter((service) => service.UUID !== Service.AccessoryInformation.UUID)
    .flatMap((service) => service.characteristics);

  for (const characteristic of held) {
    characteristic.onGet(() => {
      if (unreachable()) {
        throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
      return characteristic.value;
    });
    characteristic.onSet(() => {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    });
  }

  return () => {
    for (const characteristic of held) {
      characteristic.removeOnGet();
      characteristic.removeOnSet();
    }
  };
}
